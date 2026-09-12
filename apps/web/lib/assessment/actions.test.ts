import { describe, expect, it } from "vitest";

/**
 * `./actions.ts` is a thin orchestration layer:
 * - `authorizeAssessment` (RLS-scoped SELECT for membership check)
 * - `createServiceRoleClient` (bypasses RLS for the write)
 * - repository helpers (unit-tested in repository.test.ts)
 * - `nextExtractionMethodForManualAdd` (unit-tested in
 *   extractionMethod.test.ts)
 *
 * End-to-end behavior lands under Playwright with PR #8 once the UI
 * exists to drive these actions. This placeholder satisfies the TDD
 * gate and pins the public shape.
 */
import * as actions from "./actions";

describe("assessment actions module", () => {
  it("exports the three CRUD server actions", () => {
    expect(typeof actions.addRequirementAction).toBe("function");
    expect(typeof actions.updateRequirementAction).toBe("function");
    expect(typeof actions.deleteRequirementAction).toBe("function");
  });
});
