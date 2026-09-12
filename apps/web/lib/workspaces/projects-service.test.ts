import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperienceRecord } from "../experience/types";

const insertRepo = vi.fn();
const upsertCapsMock = vi.fn();
const recomputeMock = vi.fn();

vi.mock("./projects-repository", () => ({
  insertProjects: (...args: unknown[]) => insertRepo(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: async () => ({ __fake: true }),
}));

vi.mock("../supabase/service", () => ({
  createServiceRoleClient: () => ({ __fake: true }),
}));

vi.mock("../matching/repository", () => ({
  upsertWorkspaceCapabilities: (...args: unknown[]) => upsertCapsMock(...args),
}));

vi.mock("../matching/recompute", () => ({
  recomputeForWorkspace: (...args: unknown[]) => recomputeMock(...args),
}));

import {
  experienceRecordToProjectInsert,
  importExperienceRecords,
} from "./projects-service";

const rec: ExperienceRecord = {
  detailId: "165657",
  detailUrl: "/resources/common/VieweCmsDetails.jsp?wcs=completed&Id=165657",
  workStatus: "Completed",
  tenderId: "845283",
  referenceNo: "BKB/HO/ICT(OP)/7(5)-76/2022-2023/1217",
  title:
    "Supply, Installation & Commissioning of Servers and Server Rack for Nikash-BEFTN Service of Bangladesh Krishi Bank.",
  publishingDate: "2023-06-08",
  ministry: "Bank and Financial Institutions Division",
  division: "Bangladesh Krishi Bank",
  procuringEntity: "ICT Operation Department",
  procurementNature: "Goods",
  procurementType: "NCT",
  procurementMethod: "OTM",
  contractAwardedTo: "BEXIMCO COMPUTERS LTD",
  companyUniqueId: "1103644",
  experienceCertificateNo: "23/2022--2023/e-GP/20240711/845283/00165657",
  contractAmount: 5950000.014,
  contractStartDate: "2023-10-02",
  contractEndDate: "2024-02-11",
};

describe("experienceRecordToProjectInsert", () => {
  it("maps every relevant field", () => {
    const row = experienceRecordToProjectInsert("w-1", rec);
    expect(row.workspace_id).toBe("w-1");
    expect(row.name).toBe(rec.title);
    // Client name uses the procuring entity + division for readability
    expect(row.client_name).toContain(rec.procuringEntity);
    expect(row.country_code).toBe("BD");
    expect(row.sector).toBe(rec.procurementNature);
    expect(row.start_date).toBe(rec.contractStartDate);
    expect(row.end_date).toBe(rec.contractEndDate);
    expect(row.contract_value).toBe(rec.contractAmount);
    expect(row.currency).toBe("BDT");
    expect(row.evidence_credential_number).toBe(rec.experienceCertificateNo);
    expect(row.is_public).toBe(false);
  });

  it("puts a compact summary in the summary field", () => {
    const row = experienceRecordToProjectInsert("w-1", rec);
    expect(row.summary).toContain(rec.referenceNo);
  });

  it("trims titles longer than DB comfort by leaving DB text unbounded", () => {
    // Sanity: no client-side truncation. Postgres text can hold arbitrary length.
    const row = experienceRecordToProjectInsert("w-1", rec);
    expect(row.name.length).toBe(rec.title.length);
  });
});

describe("importExperienceRecords", () => {
  beforeEach(() => {
    insertRepo.mockReset();
    upsertCapsMock.mockReset().mockResolvedValue(undefined);
    recomputeMock.mockReset().mockResolvedValue({ matched: 0 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("returns { imported: 0 } for empty input without calling insert", async () => {
    const result = await importExperienceRecords("w-1", []);
    expect(result).toEqual({ imported: 0 });
    expect(insertRepo).not.toHaveBeenCalled();
  });

  it("maps records and delegates to insertProjects", async () => {
    insertRepo.mockResolvedValue(2);
    const result = await importExperienceRecords("w-1", [rec, rec]);
    expect(result).toEqual({ imported: 2 });
    expect(insertRepo).toHaveBeenCalledTimes(1);
    const [, rows] = insertRepo.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows[0].workspace_id).toBe("w-1");
    expect(rows[0].evidence_credential_number).toBe(
      rec.experienceCertificateNo,
    );
  });

  it("bubbles up repository errors", async () => {
    insertRepo.mockRejectedValue(new Error("rls denied"));
    await expect(importExperienceRecords("w-1", [rec])).rejects.toThrow(
      /rls denied/,
    );
  });

  it("auto-derives capabilities from imported projects (Phase 3 §2b)", async () => {
    insertRepo.mockResolvedValue(1);
    // Title deliberately hits 2+ signal words in the ERP bucket ("erp"
    // and "sap") so bucketing produces a suggestion.
    const erpProject: ExperienceRecord = {
      ...rec,
      title: "SAP ERP implementation with financial modules for X ministry",
    };
    await importExperienceRecords("w-1", [erpProject]);
    expect(upsertCapsMock).toHaveBeenCalledTimes(1);
    const [, workspaceId, rows] = upsertCapsMock.mock.calls[0];
    expect(workspaceId).toBe("w-1");
    expect(rows.length).toBeGreaterThan(0);
    // Each auto-derived row carries source='auto_derived' + confidence
    for (const r of rows) {
      expect(r.source).toBe("auto_derived");
      expect(r.confidence).toBeGreaterThan(0);
    }
    // Recompute called after auto-derive so /opportunities reflects
    // the new capabilities on next visit.
    expect(recomputeMock).toHaveBeenCalledWith(expect.anything(), "w-1");
  });

  it("skips auto-derive when nothing buckets to ≥ 2 signal words", async () => {
    insertRepo.mockResolvedValue(1);
    const bland: ExperienceRecord = { ...rec, title: "Gauze supply" };
    await importExperienceRecords("w-1", [bland]);
    expect(upsertCapsMock).not.toHaveBeenCalled();
    expect(recomputeMock).not.toHaveBeenCalled();
  });
});
