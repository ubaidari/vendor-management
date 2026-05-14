import type { CitySlug } from "@/constants/locations";

/**
 * One vendor per city — must match `backend/prisma/seed.ts` and `backend/src/vendorCatalog.ts`.
 * Karachi: KS_IT_KHI_VENDOR · Lahore: KS_IT_LHR_VENDOR · Islamabad: KS_IT_ISL_VENDOR
 */
export const VENDOR_NAME_BY_SLUG: Record<CitySlug, string> = {
  karachi: "KS_IT_KHI_VENDOR",
  lahore: "KS_IT_LHR_VENDOR",
  islamabad: "KS_IT_ISL_VENDOR"
};

/**
 * Branches per city — must match `backend/prisma/seed.ts` and `backend/src/branchCatalog.ts`.
 * C4 is **Islamabad only**. L1 is **Lahore only**. Karachi has its own list; nothing is shared across cities.
 */
export const BRANCHES_BY_SLUG: Record<CitySlug, readonly string[]> = {
  karachi: ["VitalFoakh", "BRR", "Endeavour", "Creekside", "Mega", "Clifton"],
  islamabad: ["C4"],
  lahore: ["L1"]
};

export function getVendorNameForCitySlug(slug: string | null | undefined): string | null {
  if (!slug) {
    return null;
  }
  const key = slug.toLowerCase() as CitySlug;
  return VENDOR_NAME_BY_SLUG[key] ?? null;
}
