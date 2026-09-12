import { describe, expect, it } from "vitest";
import type {
  ExperienceRecord,
  LookupParams,
  LookupResult,
  WorkStatus,
} from "./types";

describe("experience types", () => {
  it("compiles a LookupParams with just companyName", () => {
    const p: LookupParams = { companyName: "Acme" };
    expect(p.companyName).toBe("Acme");
  });

  it("compiles a full LookupParams with all filters", () => {
    const p: LookupParams = {
      companyName: "Acme",
      match: "Contains",
      workStatus: "Completed",
      experienceCertificateNo: "cert-123",
      pageNo: 1,
      pageSize: 25,
    };
    expect(p.pageSize).toBe(25);
  });

  it("compiles an ExperienceRecord with all fields", () => {
    const r: ExperienceRecord = {
      detailId: "165657",
      detailUrl: "/resources/common/VieweCmsDetails.jsp?wcs=completed&Id=165657",
      workStatus: "Completed",
      tenderId: "845283",
      referenceNo: "REF",
      title: "T",
      publishingDate: "2023-06-08",
      ministry: "M",
      division: "D",
      procuringEntity: "PE",
      procurementNature: "Goods",
      procurementType: "NCT",
      procurementMethod: "OTM",
      contractAwardedTo: "CO",
      companyUniqueId: "1",
      experienceCertificateNo: "CERT",
      contractAmount: 100,
      contractStartDate: "2023-10-02",
      contractEndDate: "2024-02-11",
    };
    expect(r.workStatus).toBe("Completed");
  });

  it("compiles a LookupResult wrapping records + paging", () => {
    const res: LookupResult = { records: [], pageNo: 1, pageSize: 10 };
    expect(res.records).toEqual([]);
  });

  it("workStatus type accepts only known values", () => {
    const s: WorkStatus = "All";
    expect(s).toBe("All");
  });
});
