/** Allow only non-negative integers in cost fields (empty allowed while typing). */
export const sanitizeIntegerCostInput = (text: string): string => text.replace(/\D/g, "");

/** Map stored number to empty string when zero so user can type without deleting "0". */
export const costNumberToInput = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return String(Math.floor(value));
};

export const parseCostInteger = (value: string): number => {
  const digits = sanitizeIntegerCostInput(value);
  if (digits.length === 0) {
    return 0;
  }
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
};
