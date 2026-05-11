/** Admin portal task categories (same for every city). */
export const ADMIN_TASK_CATEGORIES = ["Installation", "Repair"] as const;

export type AdminTaskCategory = (typeof ADMIN_TASK_CATEGORIES)[number];
