export const branches = [
  "Ks_Johar",
  "Ks_Endeavour",
  "Ks_Vital foakh",
  "Ks_Brr",
  "Ks_Clifton",
  "Ks_Creekside"
] as const;

export type Branch = (typeof branches)[number];
