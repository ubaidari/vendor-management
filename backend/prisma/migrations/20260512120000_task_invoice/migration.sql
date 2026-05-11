-- Vendor-uploaded invoice (image/PDF); one active file per task (replaced on re-upload).
ALTER TABLE "Task" ADD COLUMN "invoiceStoredName" TEXT;
ALTER TABLE "Task" ADD COLUMN "invoiceOriginalName" TEXT;
ALTER TABLE "Task" ADD COLUMN "invoiceMimeType" TEXT;
ALTER TABLE "Task" ADD COLUMN "invoiceUploadedAt" TIMESTAMP(3);
