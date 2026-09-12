/**
 * Non-action exports for the assessment module. Kept out of
 * `./actions.ts` because Next's "use server" rule bans non-async
 * exports (classes, constants, etc.) — dropping this class in the
 * actions file collapsed the whole module during client bundling.
 */

export class QuotaExceededError extends Error {
  constructor(message = "Assessment quota exhausted for this month") {
    super(message);
    this.name = "QuotaExceededError";
  }
}
