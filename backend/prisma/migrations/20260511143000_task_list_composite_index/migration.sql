-- List endpoint: WHERE "locationId" = ? AND "isDeleted" = false ORDER BY "createdAt" DESC
DROP INDEX IF EXISTS "Task_locationId_idx";
CREATE INDEX "Task_locationId_isDeleted_createdAt_idx" ON "Task" ("locationId", "isDeleted", "createdAt");
