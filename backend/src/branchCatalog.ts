/**
 * Canonical branch lists per city — must match `prisma/seed.ts` and the app `constants/locationCatalog.ts`.
 *
 * Islamabad: **C4 only** (never Lahore/Karachi).
 * Lahore: **L1 only** (never Islamabad/Karachi).
 */
export const BRANCHES_BY_SLUG = {
  karachi: ["VitalFoakh", "BRR", "Endeavour", "Creekside", "Mega"],
  islamabad: ["C4"],
  lahore: ["L1"]
} as const;

export type LocationSlug = keyof typeof BRANCHES_BY_SLUG;

export function branchNameAllowedForLocationSlug(branchName: string, locationSlug: string): boolean {
  const slug = locationSlug.toLowerCase() as LocationSlug;
  const list = BRANCHES_BY_SLUG[slug];
  return list ? (list as readonly string[]).includes(branchName) : false;
}

export function branchRejectedMessage(branchName: string, locationSlug: string): string {
  const slug = locationSlug.toLowerCase();
  if (branchName === "C4" && slug !== "islamabad") {
    return "Branch C4 is Islamabad only; it cannot be used for this city.";
  }
  if (branchName === "L1" && slug !== "lahore") {
    return "Branch L1 is Lahore only; it cannot be used for this city.";
  }
  return `Branch "${branchName}" is not defined for this city.`;
}
