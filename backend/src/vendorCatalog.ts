/**
 * Canonical vendor per city — must match `prisma/seed.ts` and `constants/locationCatalog.ts`.
 */
export const VENDOR_BY_SLUG = {
  karachi: "KS_IT_KHI_VENDOR",
  lahore: "KS_IT_LHR_VENDOR",
  islamabad: "KS_IT_ISL_VENDOR"
} as const;

export type VendorLocationSlug = keyof typeof VENDOR_BY_SLUG;

export function vendorNameAllowedForLocationSlug(vendorName: string, locationSlug: string): boolean {
  const slug = locationSlug.toLowerCase() as VendorLocationSlug;
  const expected = VENDOR_BY_SLUG[slug];
  return expected === vendorName;
}

/** Canonical vendor display name for this city slug (API / invoice checks). */
export function getExpectedVendorNameForSlug(locationSlug: string): string | undefined {
  const slug = locationSlug.toLowerCase() as VendorLocationSlug;
  return VENDOR_BY_SLUG[slug];
}

export function vendorRejectedMessage(vendorName: string, locationSlug: string): string {
  const slug = locationSlug.toLowerCase() as VendorLocationSlug;
  const expected = VENDOR_BY_SLUG[slug];
  if (!expected) {
    return "Unknown city for vendor validation.";
  }
  return `Vendor "${vendorName}" is not valid for this city. Use ${expected}.`;
}
