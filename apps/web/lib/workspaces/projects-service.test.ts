import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperienceRecord } from "../experience/types";

const insertRepo = vi.fn();

vi.mock("./projects-repository", () => ({
  insertProjects: (...args: unknown[]) => insertRepo(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: async () => ({ __fake: true }),
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
});
