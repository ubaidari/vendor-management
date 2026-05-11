-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminPin" TEXT NOT NULL,
    "vendorPin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE UNIQUE INDEX "Location_adminPin_key" ON "Location"("adminPin");
CREATE UNIQUE INDEX "Location_vendorPin_key" ON "Location"("vendorPin");

INSERT INTO "Location" ("id", "slug", "name", "adminPin", "vendorPin", "createdAt") VALUES
('loc_karachi', 'karachi', 'Karachi', '0101', '1234', CURRENT_TIMESTAMP),
('loc_lahore', 'lahore', 'Lahore', '0123', '1235', CURRENT_TIMESTAMP),
('loc_islamabad', 'islamabad', 'Islamabad', '0124', '1236', CURRENT_TIMESTAMP);

ALTER TABLE "Branch" ADD COLUMN "locationId" TEXT;
UPDATE "Branch" SET "locationId" = 'loc_karachi';
ALTER TABLE "Branch" ALTER COLUMN "locationId" SET NOT NULL;

DROP INDEX IF EXISTS "Branch_name_key";
CREATE UNIQUE INDEX "Branch_locationId_name_key" ON "Branch"("locationId", "name");
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Vendor" ADD COLUMN "locationId" TEXT;
UPDATE "Vendor" SET "locationId" = 'loc_karachi';
ALTER TABLE "Vendor" ALTER COLUMN "locationId" SET NOT NULL;

DROP INDEX IF EXISTS "Vendor_name_key";
CREATE UNIQUE INDEX "Vendor_locationId_name_key" ON "Vendor"("locationId", "name");
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD COLUMN "locationId" TEXT;
UPDATE "Task" t SET "locationId" = b."locationId" FROM "Branch" b WHERE t."branchId" = b."id";
ALTER TABLE "Task" ALTER COLUMN "locationId" SET NOT NULL;
CREATE INDEX "Task_locationId_idx" ON "Task"("locationId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Branch" ("id", "name", "locationId")
SELECT md5(b."id" || 'loc_lahore'), b."name", 'loc_lahore'
FROM "Branch" b WHERE b."locationId" = 'loc_karachi';

INSERT INTO "Branch" ("id", "name", "locationId")
SELECT md5(b."id" || 'loc_islamabad'), b."name", 'loc_islamabad'
FROM "Branch" b WHERE b."locationId" = 'loc_karachi';

INSERT INTO "Vendor" ("id", "name", "locationId")
SELECT md5(v."id" || 'loc_lahore'), v."name", 'loc_lahore'
FROM "Vendor" v WHERE v."locationId" = 'loc_karachi';

INSERT INTO "Vendor" ("id", "name", "locationId")
SELECT md5(v."id" || 'loc_islamabad'), v."name", 'loc_islamabad'
FROM "Vendor" v WHERE v."locationId" = 'loc_karachi';
