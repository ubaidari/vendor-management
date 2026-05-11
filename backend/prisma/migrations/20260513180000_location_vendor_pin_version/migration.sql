-- Vendor portal PIN rotation: bump version when admin changes PIN (app compares to stored version).
ALTER TABLE "Location" ADD COLUMN "vendorPinVersion" INTEGER NOT NULL DEFAULT 1;
