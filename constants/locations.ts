/** Three isolated sites — same slug for admin and vendor shares one dataset. */
export type CitySlug = "karachi" | "islamabad" | "lahore";

export type CityDefinition = {
  slug: CitySlug;
  name: string;
};

export const CITIES: readonly CityDefinition[] = [
  { slug: "karachi", name: "Karachi" },
  { slug: "islamabad", name: "Islamabad" },
  { slug: "lahore", name: "Lahore" }
] as const;

export const getCityBySlug = (slug: string): CityDefinition | undefined =>
  CITIES.find((c) => c.slug === slug.toLowerCase());

/** Human-readable city for headers and labels (session name, else catalog name from slug). */
export const getSessionCityDisplayLabel = (
  sessionSlug: string | null | undefined,
  sessionLocationName: string | null | undefined
): string => {
  const trimmed = sessionLocationName?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (sessionSlug) {
    const fromSlug = getCityBySlug(sessionSlug)?.name;
    if (fromSlug) {
      return fromSlug;
    }
  }
  return "Choose a city";
};
