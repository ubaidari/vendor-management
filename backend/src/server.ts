import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import multer from "multer";
import {
  Prisma,
  PrismaClient,
  TaskEventType,
  TaskStatus,
  type Location
} from "../prisma/generated-client/index.js";
import { branchNameAllowedForLocationSlug, branchRejectedMessage } from "./branchCatalog.js";
import {
  getExpectedVendorNameForSlug,
  vendorNameAllowedForLocationSlug,
  vendorRejectedMessage
} from "./vendorCatalog.js";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 4000);

/** Keep rows and payloads bounded; INT columns max out at 2^31-1 in PostgreSQL. */
const PG_INT4_MAX = 2147483647;
const TASK_TITLE_MAX_LEN = 500;
const TASK_CATEGORY_MAX_LEN = 120;
const TASK_DESCRIPTION_MAX_LEN = 8000;
const TASK_EXTRA_REASON_MAX_LEN = 2000;

const clampIntCost = (value: unknown): number => {
  const v = Math.floor(Number(value));
  if (!Number.isFinite(v) || v < 0) {
    return 0;
  }
  return Math.min(v, PG_INT4_MAX);
};

const validateTaskTextFields = (
  res: express.Response,
  fields: { title: string; category: string; description: string }
): boolean => {
  if (fields.title.length > TASK_TITLE_MAX_LEN) {
    res.status(400).json({ message: `title must be at most ${TASK_TITLE_MAX_LEN} characters` });
    return false;
  }
  if (fields.category.length > TASK_CATEGORY_MAX_LEN) {
    res.status(400).json({ message: `category must be at most ${TASK_CATEGORY_MAX_LEN} characters` });
    return false;
  }
  if (fields.description.length > TASK_DESCRIPTION_MAX_LEN) {
    res.status(400).json({ message: `description must be at most ${TASK_DESCRIPTION_MAX_LEN} characters` });
    return false;
  }
  return true;
};

const INVOICE_DIR = path.join(process.cwd(), "uploads", "invoices");
const INVOICE_MAX_BYTES = 15 * 1024 * 1024;
/** Invoices are JPEG images only (same for every city). */
const INVOICE_ALLOWED_MIME = new Set(["image/jpeg"]);

const ensureInvoiceDir = (): void => {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
};
ensureInvoiceDir();

const unlinkInvoiceFile = (storedName: string | null | undefined): void => {
  if (!storedName || storedName.includes("/") || storedName.includes("..") || storedName.includes("\\")) {
    return;
  }
  const full = path.join(INVOICE_DIR, path.basename(storedName));
  try {
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  } catch (e) {
    console.error("Failed to remove invoice file", storedName, e);
  }
};

const invoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, INVOICE_DIR);
  },
  filename: (req, _file, cb) => {
    const raw = req.params.taskId;
    const id = Array.isArray(raw) ? (raw[0] ?? "task") : (raw ?? "task");
    cb(null, `${id}_${crypto.randomUUID()}.jpg`);
  }
});

const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: { fileSize: INVOICE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (INVOICE_ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invoices must be JPEG images (.jpg), max 15 MB."));
    }
  }
});

/** `instanceof` can fail across duplicate Prisma runtimes; duck-typing is reliable. */
const isPrismaKnownRequest = (err: unknown): err is Prisma.PrismaClientKnownRequestError =>
  typeof err === "object" &&
  err !== null &&
  (err as { name?: string }).name === "PrismaClientKnownRequestError" &&
  typeof (err as { code?: string }).code === "string";

app.use(cors());
app.use(express.json());

/** Express 5 does not always forward async rejections to the error middleware; this wrapper does. */
const asyncRoute =
  (
    handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>
  ): express.RequestHandler =>
  (req, res, next) => {
    void handler(req, res, next).catch(next);
  };

const taskIdFrom = (req: express.Request): string => {
  const raw = req.params.taskId;
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
};

type TaskApi = {
  id: string;
  title: string;
  branch: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "on-hold" | "completed";
  vendor: string;
  labourCost: number;
  installationCost: number;
  repairCost: number;
  extraCost: number;
  extraReason: string;
  createdAt: string;
  completedAt: string | null;
  hasInvoice: boolean;
  invoiceOriginalName: string | null;
  invoiceUploadedAt: string | null;
};

const toApiStatus = (status: TaskStatus): TaskApi["status"] => {
  if (status === "in_progress") {
    return "in-progress";
  }
  if (status === "on_hold") {
    return "on-hold";
  }
  return status;
};

const toDbStatus = (status: string): TaskStatus => {
  if (status === "in-progress") {
    return "in_progress";
  }
  if (status === "completed") {
    return "completed";
  }
  if (status === "on-hold") {
    return "on_hold";
  }
  return "pending";
};

const normalizeSlug = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const t = value.trim().toLowerCase();
  if (!t) {
    return null;
  }
  return t;
};

const getLocationSlugFromRequest = (req: express.Request): string | null => {
  return normalizeSlug(req.header("x-location-slug") ?? req.header("X-Location-Slug"));
};

const getPortalRoleFromRequest = (req: express.Request): "admin" | "vendor" | null => {
  const raw = (req.header("x-portal-role") ?? req.header("X-Portal-Role") ?? "").trim().toLowerCase();
  if (raw === "admin" || raw === "vendor") {
    return raw;
  }
  return null;
};

type ScopedPortal = { location: Location; role: "admin" | "vendor" };

const resolveScopedPortal = async (req: express.Request): Promise<ScopedPortal | null> => {
  const slug = getLocationSlugFromRequest(req);
  const role = getPortalRoleFromRequest(req);
  if (!slug || !role) {
    return null;
  }
  const location = await prisma.location.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      adminPin: true,
      vendorPin: true,
      vendorPinVersion: true,
      createdAt: true
    }
  });
  if (!location) {
    return null;
  }
  return { location: location as Location, role };
};

const requirePortal = async (
  req: express.Request,
  mode: "read" | "admin" | "vendor"
): Promise<Location | null> => {
  const scoped = await resolveScopedPortal(req);
  if (!scoped) {
    return null;
  }
  if (mode === "read") {
    return scoped.location;
  }
  if (mode === "admin" && scoped.role !== "admin") {
    return null;
  }
  if (mode === "vendor" && scoped.role !== "vendor") {
    return null;
  }
  return scoped.location;
};

const assertActiveTaskInLocation = async (locationId: string, taskId: string) => {
  return prisma.task.findFirst({
    where: { id: taskId, locationId, isDeleted: false }
  });
};

const loadTaskWithVendorInLocation = async (locationId: string, taskId: string) => {
  return prisma.task.findFirst({
    where: { id: taskId, locationId, isDeleted: false },
    include: { vendor: true }
  });
};

const vendorOwnsTaskForLocation = (taskVendorName: string, locationSlug: string): boolean => {
  const expected = getExpectedVendorNameForSlug(locationSlug);
  return !!expected && taskVendorName === expected;
};

const writeTaskEvent = async (
  taskId: string,
  type: TaskEventType,
  actor: string,
  message: string
): Promise<void> => {
  await prisma.taskEvent.create({
    data: {
      taskId,
      type,
      actor,
      message
    }
  });
};

const mapTaskToApi = (task: {
  id: string;
  title: string;
  category: string;
  description: string;
  status: TaskStatus;
  labourCost: number;
  installationCost: number;
  repairCost: number;
  extraCost: number;
  extraReason: string;
  createdAt: Date;
  completedAt: Date | null;
  invoiceStoredName?: string | null;
  invoiceOriginalName?: string | null;
  invoiceMimeType?: string | null;
  invoiceUploadedAt?: Date | null;
  branch?: { name: string } | null;
  vendor?: { name: string } | null;
}): TaskApi => ({
  id: task.id,
  title: task.title,
  branch: task.branch?.name ?? "Unknown",
  category: task.category,
  description: task.description,
  status: toApiStatus(task.status),
  vendor: task.vendor?.name ?? "Unknown",
  labourCost: task.labourCost,
  installationCost: task.installationCost,
  repairCost: task.repairCost,
  extraCost: task.extraCost,
  extraReason: task.extraReason,
  createdAt: task.createdAt.toISOString(),
  completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  hasInvoice: Boolean(task.invoiceStoredName),
  invoiceOriginalName: task.invoiceOriginalName ?? null,
  invoiceUploadedAt: task.invoiceUploadedAt ? task.invoiceUploadedAt.toISOString() : null
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/** Public list of cities (no secrets). */
app.get("/locations", asyncRoute(async (_req, res) => {
  const rows = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true }
  });
  res.json(rows);
}));

const normalizeVendorPortalPin = (raw: unknown): string | null => {
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim();
  if (!/^\d{4,12}$/.test(t)) {
    return null;
  }
  return t;
};

/** Resolve vendor portal PIN to a city (no auth headers). */
app.post("/vendor/portal-pin/verify", asyncRoute(async (req, res) => {
  const pin = normalizeVendorPortalPin((req.body as { pin?: unknown })?.pin);
  if (!pin) {
    res.status(400).json({ message: "Enter a numeric PIN (4–12 digits)." });
    return;
  }
  const location = await prisma.location.findFirst({
    where: { vendorPin: pin },
    select: { slug: true, name: true, vendorPinVersion: true }
  });
  if (!location) {
    res.status(401).json({ message: "Incorrect vendor portal PIN." });
    return;
  }
  res.json({
    slug: location.slug,
    name: location.name,
    pinVersion: location.vendorPinVersion
  });
}));

/** Current PIN generation on the server (vendor must re-enter PIN after admin changes it). */
app.get("/vendor/portal-pin/status", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "vendor");
  if (!loc) {
    res.status(401).json({
      message: "Vendor session required (X-Location-Slug and X-Portal-Role: vendor)."
    });
    return;
  }
  const row = await prisma.location.findUnique({
    where: { id: loc.id },
    select: { vendorPinVersion: true }
  });
  if (!row) {
    res.status(404).json({ message: "Location not found." });
    return;
  }
  res.json({ pinVersion: row.vendorPinVersion });
}));

/** List vendor portal PIN for every city (admin tooling). */
app.get("/admin/vendor-portal-pins", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "admin");
  if (!loc) {
    res.status(401).json({
      message: "Admin session required (X-Location-Slug and X-Portal-Role: admin)."
    });
    return;
  }
  const rows = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, vendorPin: true, vendorPinVersion: true }
  });
  res.json(rows);
}));

/** Change vendor portal PIN for one city; bumps version so vendor apps drop saved sessions. */
app.patch("/admin/locations/:targetSlug/vendor-pin", asyncRoute(async (req, res) => {
  const adminLoc = await requirePortal(req, "admin");
  if (!adminLoc) {
    res.status(401).json({
      message: "Admin session required (X-Location-Slug and X-Portal-Role: admin)."
    });
    return;
  }
  const targetSlug = normalizeSlug(req.params.targetSlug);
  if (!targetSlug) {
    res.status(400).json({ message: "Invalid location slug." });
    return;
  }
  const body = req.body as { vendorPin?: unknown; pin?: unknown };
  const pin = normalizeVendorPortalPin(body.vendorPin ?? body.pin);
  if (!pin) {
    res.status(400).json({ message: "vendorPin must be numeric, 4–12 digits, unique across cities." });
    return;
  }
  const target = await prisma.location.findUnique({
    where: { slug: targetSlug },
    select: { slug: true, name: true, vendorPin: true, vendorPinVersion: true }
  });
  if (!target) {
    res.status(404).json({ message: "Location not found." });
    return;
  }
  if (target.vendorPin === pin) {
    res.json({
      ok: true,
      slug: target.slug,
      name: target.name,
      vendorPin: target.vendorPin,
      vendorPinVersion: target.vendorPinVersion,
      unchanged: true
    });
    return;
  }
  const duplicate = await prisma.location.findFirst({
    where: { vendorPin: pin, slug: { not: targetSlug } }
  });
  if (duplicate) {
    res.status(409).json({
      message: "That PIN is already used for another city. Choose a different PIN."
    });
    return;
  }
  const updated = await prisma.location.update({
    where: { slug: targetSlug },
    data: {
      vendorPin: pin,
      vendorPinVersion: { increment: 1 }
    },
    select: { slug: true, name: true, vendorPin: true, vendorPinVersion: true }
  });
  res.json({ ok: true, ...updated });
}));

app.get("/branches", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "read");
  if (!loc) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }
  const branches = await prisma.branch.findMany({
    where: { locationId: loc.id },
    orderBy: { name: "asc" }
  });
  res.json(branches.map((b) => b.name));
}));

app.get("/vendors", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "read");
  if (!loc) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }
  const vendors = await prisma.vendor.findMany({
    where: { locationId: loc.id },
    orderBy: { name: "asc" }
  });
  res.json(vendors.map((v) => v.name));
}));

app.get("/tasks", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "read");
  if (!loc) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }

  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const vendor = typeof req.query.vendor === "string" ? req.query.vendor : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      locationId: loc.id,
      isDeleted: false,
      status: status ? toDbStatus(status) : undefined,
      branch: branch ? { name: branch, locationId: loc.id } : undefined,
      vendor: vendor ? { name: vendor, locationId: loc.id } : undefined,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { vendor: { name: { contains: q, mode: "insensitive" } } }
          ]
        : undefined
    },
    include: {
      branch: true,
      vendor: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(tasks.map((task) => mapTaskToApi(task)));
}));

/** Aggregated counts and costs for this location only (never mixed with other cities). */
app.get("/tasks/metrics", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "read");
  if (!loc) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }

  const base = { locationId: loc.id, isDeleted: false } as const;

  const [pending, inProgress, onHold, completed, sumRow] = await Promise.all([
    prisma.task.count({ where: { ...base, status: "pending" } }),
    prisma.task.count({ where: { ...base, status: "in_progress" } }),
    prisma.task.count({ where: { ...base, status: "on_hold" } }),
    prisma.task.count({ where: { ...base, status: "completed" } }),
    prisma.task.aggregate({
      where: base,
      _sum: {
        labourCost: true,
        installationCost: true,
        repairCost: true,
        extraCost: true
      }
    })
  ]);

  const total = pending + inProgress + onHold + completed;
  const s = sumRow._sum;
  const totalCost =
    (s.labourCost ?? 0) + (s.installationCost ?? 0) + (s.repairCost ?? 0) + (s.extraCost ?? 0);

  res.json({
    total,
    pending,
    inProgress,
    onHold,
    completed,
    totalCost
  });
}));

app.post(
  "/tasks",
  asyncRoute(async (req, res) => {
    const loc = await requirePortal(req, "admin");
    if (!loc) {
      res.status(401).json({ message: "Admin actions require X-Portal-Role: admin and X-Location-Slug." });
      return;
    }

    const { title, branch, category, vendor, description } = req.body as {
      title?: string;
      branch?: string;
      category?: string;
      vendor?: string;
      description?: string;
    };

    if (!title || !branch || !vendor) {
      res.status(400).json({ message: "title, branch, and vendor are required" });
      return;
    }

    const branchTrimmed = branch.trim();
    if (!branchNameAllowedForLocationSlug(branchTrimmed, loc.slug)) {
      res.status(400).json({ message: branchRejectedMessage(branchTrimmed, loc.slug) });
      return;
    }

    const vendorTrimmed = vendor.trim();
    if (!vendorNameAllowedForLocationSlug(vendorTrimmed, loc.slug)) {
      res.status(400).json({ message: vendorRejectedMessage(vendorTrimmed, loc.slug) });
      return;
    }

    const sessionLocationId = loc.id;
    if (typeof sessionLocationId !== "string" || !sessionLocationId) {
      res.status(500).json({
        message: "Session location is invalid. Pick your city again in the app, or restart the API server."
      });
      return;
    }

    const [branchRow, vendorRow] = await Promise.all([
      prisma.branch.findFirst({ where: { locationId: sessionLocationId, name: branchTrimmed } }),
      prisma.vendor.findFirst({ where: { locationId: sessionLocationId, name: vendorTrimmed } })
    ]);

    if (!branchRow || !vendorRow) {
      res.status(400).json({ message: "Invalid branch or vendor for this city" });
      return;
    }

    if (branchRow.locationId !== sessionLocationId || vendorRow.locationId !== sessionLocationId) {
      res.status(400).json({ message: "Invalid branch or vendor for this city" });
      return;
    }

    const titleTrimmed = title.trim();
    const categoryTrimmed = (category ?? "General").trim() || "General";
    const descriptionTrimmed = (description ?? "N/A").trim() || "N/A";
    if (!validateTaskTextFields(res, { title: titleTrimmed, category: categoryTrimmed, description: descriptionTrimmed })) {
      return;
    }

    const locationIdForTask = branchRow.locationId;
    if (!locationIdForTask) {
      res.status(500).json({
        message: "Server data error: branch has no location. Run: npx prisma migrate deploy && npx tsx prisma/seed.ts"
      });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title: titleTrimmed,
        category: categoryTrimmed,
        description: descriptionTrimmed,
        status: "pending",
        location: { connect: { id: locationIdForTask } },
        branch: { connect: { id: branchRow.id } },
        vendor: { connect: { id: vendorRow.id } }
      },
      include: {
        branch: true,
        vendor: true
      }
    });

    void writeTaskEvent(task.id, "created", "admin", "Task created from admin portal").catch((eventErr) => {
      console.error("TaskEvent create failed (task was saved):", eventErr);
    });

    res.status(201).json(mapTaskToApi(task));
  })
);

app.patch("/tasks/:taskId/costs", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "vendor");
  if (!loc) {
    res.status(401).json({ message: "Vendor actions require X-Portal-Role: vendor and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const { labourCost, installationCost, repairCost, extraCost, extraReason } = req.body as {
    labourCost?: number;
    installationCost?: number;
    repairCost?: number;
    extraCost?: number;
    extraReason?: string;
  };

  const existingTask = await assertActiveTaskInLocation(loc.id, taskId);
  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  const extraReasonTrimmed = (extraReason ?? "N/A").trim() || "N/A";
  if (extraReasonTrimmed.length > TASK_EXTRA_REASON_MAX_LEN) {
    res.status(400).json({ message: `extraReason must be at most ${TASK_EXTRA_REASON_MAX_LEN} characters` });
    return;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      labourCost: clampIntCost(labourCost),
      installationCost: clampIntCost(installationCost),
      repairCost: clampIntCost(repairCost),
      extraCost: clampIntCost(extraCost),
      extraReason: extraReasonTrimmed
    }
  });

  await writeTaskEvent(taskId, "costs_updated", "vendor", "Vendor updated task costs");

  res.json({ ok: true });
}));

app.patch("/tasks/:taskId/complete", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "vendor");
  if (!loc) {
    res.status(401).json({ message: "Vendor actions require X-Portal-Role: vendor and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const existingTask = await assertActiveTaskInLocation(loc.id, taskId);
  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "completed", completedAt: new Date() }
  });
  await writeTaskEvent(taskId, "marked_completed", "vendor", "Vendor marked task completed");
  res.json({ ok: true });
}));

app.patch("/tasks/:taskId/hold", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "vendor");
  if (!loc) {
    res.status(401).json({ message: "Vendor actions require X-Portal-Role: vendor and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const existingTask = await assertActiveTaskInLocation(loc.id, taskId);
  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "on_hold", completedAt: null }
  });
  await writeTaskEvent(taskId, "moved_to_hold", "vendor", "Vendor moved task to on-hold");
  res.json({ ok: true });
}));

app.patch("/tasks/:taskId", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "admin");
  if (!loc) {
    res.status(401).json({ message: "Admin actions require X-Portal-Role: admin and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const { title, branch, category, vendor, description } = req.body as {
    title?: string;
    branch?: string;
    category?: string;
    vendor?: string;
    description?: string;
  };

  if (!title || !branch || !vendor) {
    res.status(400).json({ message: "title, branch, and vendor are required" });
    return;
  }

  const branchTrimmed = branch.trim();
  if (!branchNameAllowedForLocationSlug(branchTrimmed, loc.slug)) {
    res.status(400).json({ message: branchRejectedMessage(branchTrimmed, loc.slug) });
    return;
  }

  const vendorTrimmed = vendor.trim();
  if (!vendorNameAllowedForLocationSlug(vendorTrimmed, loc.slug)) {
    res.status(400).json({ message: vendorRejectedMessage(vendorTrimmed, loc.slug) });
    return;
  }

  const existingTask = await assertActiveTaskInLocation(loc.id, taskId);

  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  if (existingTask.status === "completed") {
    res.status(400).json({ message: "Completed tasks cannot be edited" });
    return;
  }

  const titleTrimmed = title.trim();
  const categoryTrimmed = (category ?? "General").trim() || "General";
  const descriptionTrimmed = (description ?? "N/A").trim() || "N/A";
  if (!validateTaskTextFields(res, { title: titleTrimmed, category: categoryTrimmed, description: descriptionTrimmed })) {
    return;
  }

  const [branchRow, vendorRow] = await Promise.all([
    prisma.branch.findFirst({ where: { locationId: loc.id, name: branchTrimmed } }),
    prisma.vendor.findFirst({ where: { locationId: loc.id, name: vendorTrimmed } })
  ]);

  if (!branchRow || !vendorRow) {
    res.status(400).json({ message: "Invalid branch or vendor for this city" });
    return;
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: titleTrimmed,
      branchId: branchRow.id,
      category: categoryTrimmed,
      vendorId: vendorRow.id,
      locationId: branchRow.locationId,
      description: descriptionTrimmed
    },
    include: {
      branch: true,
      vendor: true
    }
  });

  await writeTaskEvent(taskId, "updated", "admin", "Admin edited task assignment details");

  res.json(mapTaskToApi(updatedTask as Parameters<typeof mapTaskToApi>[0]));
}));

app.delete("/tasks/:taskId", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "admin");
  if (!loc) {
    res.status(401).json({ message: "Admin actions require X-Portal-Role: admin and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const existingTask = (await prisma.task.findFirst({
    where: { id: taskId, locationId: loc.id, isDeleted: false },
    select: { id: true, invoiceStoredName: true }
  })) as { id: string; invoiceStoredName: string | null } | null;
  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { isDeleted: true, deletedAt: new Date() }
  });
  unlinkInvoiceFile(existingTask.invoiceStoredName);
  await writeTaskEvent(taskId, "soft_deleted", "admin", "Admin soft-deleted task");
  res.status(204).send();
}));

app.post("/tasks/:taskId/delete", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "admin");
  if (!loc) {
    res.status(401).json({ message: "Admin actions require X-Portal-Role: admin and X-Location-Slug." });
    return;
  }

  const taskId = taskIdFrom(req);
  const existingTask = (await prisma.task.findFirst({
    where: { id: taskId, locationId: loc.id, isDeleted: false },
    select: { id: true, invoiceStoredName: true }
  })) as { id: string; invoiceStoredName: string | null } | null;
  if (!existingTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { isDeleted: true, deletedAt: new Date() }
  });
  unlinkInvoiceFile(existingTask.invoiceStoredName);
  await writeTaskEvent(taskId, "soft_deleted", "admin", "Admin soft-deleted task");
  res.json({ ok: true });
}));

app.get("/tasks/:taskId/invoice", asyncRoute(async (req, res) => {
  const scoped = await resolveScopedPortal(req);
  if (!scoped) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }

  const taskId = taskIdFrom(req);
  const taskRaw = await loadTaskWithVendorInLocation(scoped.location.id, taskId);
  const task = taskRaw as typeof taskRaw & {
    invoiceStoredName: string | null;
    invoiceOriginalName: string | null;
    invoiceMimeType: string | null;
  };
  if (!task || !task.invoiceStoredName || !task.invoiceMimeType) {
    res.status(404).json({ message: "No invoice uploaded for this task." });
    return;
  }
  if (scoped.role === "vendor" && !vendorOwnsTaskForLocation(task.vendor.name, scoped.location.slug)) {
    res.status(403).json({ message: "You can only download invoices for your vendor's tasks." });
    return;
  }

  const filePath = path.join(INVOICE_DIR, path.basename(task.invoiceStoredName));
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: "Invoice file is missing on the server." });
    return;
  }

  /** Invoices are always JPEG; download uses a fixed .jpg name (no .bin / PDF). */
  const downloadName = `invoice_${taskId}.jpg`;

  try {
    const buf = fs.readFileSync(filePath);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.send(buf);
  } catch (err) {
    console.error("GET /tasks/:taskId/invoice read failed", filePath, err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not read the invoice file from disk." });
    }
  }
}));

type InvoiceTaskRow = NonNullable<Awaited<ReturnType<typeof loadTaskWithVendorInLocation>>> & {
  invoiceStoredName: string | null;
};

app.post(
  "/tasks/:taskId/invoice",
  (req, res, next) => {
    void (async (): Promise<void> => {
      try {
        const loc = await requirePortal(req, "vendor");
        if (!loc) {
          res.status(401).json({ message: "Vendor actions require X-Portal-Role: vendor and X-Location-Slug." });
          return;
        }
        const taskId = taskIdFrom(req);
        const row = await loadTaskWithVendorInLocation(loc.id, taskId);
        if (!row) {
          res.status(404).json({ message: "Task not found" });
          return;
        }
        if (!vendorOwnsTaskForLocation(row.vendor.name, loc.slug)) {
          res.status(403).json({
            message: "You can only upload invoices for tasks assigned to your vendor for this city."
          });
          return;
        }
        (res.locals as { invoiceTaskRow?: InvoiceTaskRow }).invoiceTaskRow = row;
        next();
      } catch (e) {
        next(e);
      }
    })();
  },
  (req, res, next) => {
    invoiceUpload.single("invoice")(req, res, (err: unknown) => {
      if (err) {
        if (!res.headersSent) {
          res.status(400).json({
            message: err instanceof Error ? err.message : "Upload failed. Use a JPEG image, max 15 MB."
          });
        }
        return;
      }
      next();
    });
  },
  asyncRoute(async (req, res) => {
    const row = (res.locals as { invoiceTaskRow?: InvoiceTaskRow }).invoiceTaskRow;
    const file = req.file;
    if (!row) {
      if (file?.filename) {
        unlinkInvoiceFile(file.filename);
      }
      res.status(500).json({ message: "Upload session was lost. Try again." });
      return;
    }
    if (!file) {
      res.status(400).json({ message: 'Missing file field "invoice" (multipart form).' });
      return;
    }

    const taskId = taskIdFrom(req);
    const storedName = file.filename;
    const prior = (row as InvoiceTaskRow).invoiceStoredName;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        invoiceStoredName: storedName,
        invoiceOriginalName: "invoice.jpg",
        invoiceMimeType: "image/jpeg",
        invoiceUploadedAt: new Date()
      } as never
    });

    if (prior && prior !== storedName) {
      unlinkInvoiceFile(prior);
    }

    res.status(201).json({
      ok: true,
      hasInvoice: true,
      invoiceOriginalName: "invoice.jpg",
      invoiceUploadedAt: new Date().toISOString()
    });
  })
);

app.get("/tasks/:taskId/events", asyncRoute(async (req, res) => {
  const loc = await requirePortal(req, "read");
  if (!loc) {
    res.status(401).json({
      message: "Send X-Location-Slug and X-Portal-Role (admin or vendor)."
    });
    return;
  }

  const taskId = taskIdFrom(req);
  const task = await assertActiveTaskInLocation(loc.id, taskId);
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  const events = await prisma.taskEvent.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" }
  });
  res.json(
    events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      message: event.message,
      createdAt: event.createdAt.toISOString()
    }))
  );
}));

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) {
      return;
    }
    console.error(err);
    res.type("application/json");
    const errName = typeof err === "object" && err !== null ? (err as { name?: string }).name : undefined;
    if (errName === "PrismaClientValidationError") {
      res.status(400).json({
        message: "Invalid data for this request. Check branch, vendor, and fields, then try again."
      });
      return;
    }
    if (isPrismaKnownRequest(err)) {
      if (err.code === "P2011" || err.message.includes("Null constraint")) {
        res.status(400).json({
          message:
            "Database rejected the request. Restart the backend from the backend folder (npm install && npm start), then try again."
        });
        return;
      }
      res.status(400).json({ message: "Request could not be completed." });
      return;
    }
    res.status(500).json({
      message: err instanceof Error ? err.message : "Internal server error."
    });
  }
);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${port} (all interfaces — use your PC LAN IP for phones)`);
  console.log("Leave this window open while you use the app. Press Ctrl+C here to stop the API.");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the other process or set PORT in backend/.env to another port.`);
  } else {
    console.error("Server failed to start:", err);
  }
  process.exit(1);
});
