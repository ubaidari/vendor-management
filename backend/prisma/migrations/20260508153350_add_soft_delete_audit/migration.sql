-- CreateEnum
CREATE TYPE "TaskEventType" AS ENUM ('created', 'updated', 'costs_updated', 'moved_to_hold', 'marked_completed', 'soft_deleted');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "TaskEventType" NOT NULL,
    "actor" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_createdAt_idx" ON "TaskEvent"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_isDeleted_createdAt_idx" ON "Task"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Task_status_isDeleted_idx" ON "Task"("status", "isDeleted");

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
