import type { Task } from "@/data/tasks";

/** Aggregates for the current portal location only (server enforces via headers). */
export type TaskMetrics = {
  total: number;
  pending: number;
  inProgress: number;
  onHold: number;
  completed: number;
  totalCost: number;
};

const taskRowCost = (task: Task): number =>
  task.labourCost + task.installationCost + task.repairCost + task.extraCost;

/** Used when `/tasks/metrics` is missing or errors; same scope as `tasks` (already filtered by city on the server). */
export const deriveTaskMetricsFromTasks = (tasks: Task[]): TaskMetrics => {
  let pending = 0;
  let inProgress = 0;
  let onHold = 0;
  let completed = 0;
  let totalCost = 0;
  for (const t of tasks) {
    totalCost += taskRowCost(t);
    if (t.status === "pending") {
      pending += 1;
    } else if (t.status === "in-progress") {
      inProgress += 1;
    } else if (t.status === "on-hold") {
      onHold += 1;
    } else if (t.status === "completed") {
      completed += 1;
    }
  }
  return {
    total: tasks.length,
    pending,
    inProgress,
    onHold,
    completed,
    totalCost
  };
};
