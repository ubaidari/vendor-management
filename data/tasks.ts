export type TaskStatus = "pending" | "in-progress" | "on-hold" | "completed";

export type Task = {
  id: string;
  title: string;
  branch: string;
  category: string;
  description?: string;
  status: TaskStatus;
  vendor: string;
  labourCost: number;
  installationCost: number;
  repairCost: number;
  extraCost: number;
  extraReason: string;
  createdAt?: string;
  completedAt?: string | null;
  hasInvoice: boolean;
  invoiceOriginalName?: string | null;
  invoiceUploadedAt?: string | null;
};
