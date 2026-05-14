import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { InteractionManager } from "react-native";
import { deriveTaskMetricsFromTasks, type TaskMetrics } from "@/data/metrics";
import type { Task } from "@/data/tasks";
import { apiClient } from "@/services/apiClient";
import { taskService } from "@/services/taskService";
import { locationSession } from "@/services/locationSession";

type CreateTaskInput = {
  title: string;
  branch: string;
  category: string;
  vendor: string;
  description: string;
};

type UpdateTaskCostsInput = {
  taskId: string;
  labourCost: number;
  installationCost: number;
  repairCost: number;
  extraCost: number;
  extraReason: string;
};

type UpdateTaskInput = {
  taskId: string;
  title: string;
  branch: string;
  category: string;
  vendor: string;
  description: string;
};

type TaskStoreContextValue = {
  tasks: Task[];
  /** DB aggregates for the active city only; use for headline totals so cities never mix. */
  metrics: TaskMetrics | null;
  branches: string[];
  vendors: string[];
  isLoading: boolean;
  addTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  updateTaskCosts: (input: UpdateTaskCostsInput) => Promise<void>;
  holdTask: (taskId: string) => Promise<void>;
  markTaskCompleted: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Merge invoice flags after upload — avoids a full refetch that can reset in-progress form state. */
  applyInvoiceUploadResult: (
    taskId: string,
    meta: { hasInvoice: boolean; invoiceOriginalName: string | null; invoiceUploadedAt: string | null }
  ) => void;
};

const TaskStoreContext = createContext<TaskStoreContextValue | undefined>(undefined);

export const TaskProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    locationSession.hydrateFromStorage().finally(() => {
      if (active) {
        setSessionReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!apiClient.hasLocationSession()) {
      setTasks([]);
      setMetrics(null);
      setBranches([]);
      setVendors([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [nextTasks, nextBranches, nextVendors] = await Promise.all([
        taskService.getTasks(),
        taskService.getBranches(),
        taskService.getVendors()
      ]);

      let nextMetrics: TaskMetrics;
      try {
        nextMetrics = await taskService.getTaskMetrics();
      } catch {
        nextMetrics = deriveTaskMetricsFromTasks(nextTasks);
      }

      setTasks(nextTasks);
      setMetrics(nextMetrics);
      setBranches(nextBranches);
      setVendors(nextVendors);
    } catch (error) {
      console.error("Failed to load task store", error);
      setTasks([]);
      setMetrics(null);
      setBranches([]);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void refresh().catch((error) => {
        console.error("Failed to load task store", error);
        setIsLoading(false);
      });
    });
    return () => task.cancel();
  }, [sessionReady, refresh]);

  useEffect(() => {
    return apiClient.subscribeSession(() => {
      setTasks([]);
      setMetrics(null);
      setBranches([]);
      setVendors([]);
      if (apiClient.hasLocationSession()) {
        setIsLoading(true);
        void refresh();
      } else {
        setIsLoading(false);
      }
    });
  }, [refresh]);

  const addTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const normalizedTitle = input.title.trim();
    const normalizedDescription = input.description.trim();
    const normalizedCategory = input.category.trim();
    await taskService.createTask({
      title: normalizedTitle,
      branch: input.branch,
      category: normalizedCategory || "General",
      vendor: input.vendor,
      description: normalizedDescription
    });
    await refresh();
  }, [refresh]);

  const updateTaskCosts = useCallback(async (input: UpdateTaskCostsInput): Promise<void> => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === input.taskId
          ? {
              ...task,
              labourCost: input.labourCost,
              installationCost: input.installationCost,
              repairCost: input.repairCost,
              extraCost: input.extraCost,
              extraReason: input.extraReason
            }
          : task
      )
    );
    try {
      await taskService.updateTaskCosts(input);
      await refresh();
    } catch (error) {
      console.error("Failed to update task costs", error);
      await refresh();
    }
  }, [refresh]);

  const updateTask = useCallback(async (input: UpdateTaskInput): Promise<void> => {
    const normalizedTitle = input.title.trim();
    const normalizedCategory = input.category.trim();
    const normalizedDescription = input.description.trim();
    const updated = await taskService.updateTask({
      taskId: input.taskId,
      title: normalizedTitle,
      branch: input.branch,
      category: normalizedCategory || "General",
      vendor: input.vendor,
      description: normalizedDescription || "N/A"
    });
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === input.taskId ? updated : task))
    );
    await refresh();
  }, [refresh]);

  const markTaskCompleted = useCallback(async (taskId: string): Promise<void> => {
    const completedAt = new Date().toISOString();
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: "completed", completedAt } : task
      )
    );
    try {
      await taskService.markTaskCompleted(taskId);
      await refresh();
    } catch (error) {
      console.error("Failed to mark completed", error);
      await refresh();
    }
  }, [refresh]);

  const holdTask = useCallback(async (taskId: string): Promise<void> => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: "on-hold", completedAt: null } : task
      )
    );
    try {
      await taskService.holdTask(taskId);
      await refresh();
    } catch (error) {
      console.error("Failed to hold task", error);
      await refresh();
    }
  }, [refresh]);

  const applyInvoiceUploadResult = useCallback(
    (
      taskId: string,
      meta: { hasInvoice: boolean; invoiceOriginalName: string | null; invoiceUploadedAt: string | null }
    ): void => {
      setTasks((currentTasks) =>
        currentTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                hasInvoice: meta.hasInvoice,
                invoiceOriginalName: meta.invoiceOriginalName,
                invoiceUploadedAt: meta.invoiceUploadedAt
              }
            : t
        )
      );
    },
    []
  );

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    let rollback: Task[] | null = null;
    setTasks((currentTasks) => {
      rollback = currentTasks;
      return currentTasks.filter((task) => task.id !== taskId);
    });
    try {
      await taskService.deleteTask(taskId);
      await refresh();
    } catch (error) {
      console.error("Failed to delete task", error);
      if (rollback) {
        setTasks(rollback);
      }
      throw error;
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      tasks,
      metrics,
      branches,
      vendors,
      isLoading,
      addTask,
      updateTask,
      updateTaskCosts,
      holdTask,
      markTaskCompleted,
      deleteTask,
      refresh,
      applyInvoiceUploadResult
    }),
    [
      tasks,
      metrics,
      branches,
      vendors,
      isLoading,
      addTask,
      updateTask,
      updateTaskCosts,
      holdTask,
      markTaskCompleted,
      deleteTask,
      refresh,
      applyInvoiceUploadResult
    ]
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
};

export const useTaskStore = (): TaskStoreContextValue => {
  const context = useContext(TaskStoreContext);

  if (!context) {
    throw new Error("useTaskStore must be used inside TaskProvider");
  }

  return context;
};
