-- 10 mock tasks for Lahore (location loc_lahore, branch L1, vendor KS_IT_LHR_VENDOR).
-- Safe to apply once; Prisma records this migration so it does not re-run.

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_001', 'Lobby HVAC filter (mock)', 'Maintenance', 'Quarterly filter check — mock seed.', 'pending'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_002', 'Fire extinguisher inspection (mock)', 'Safety', 'Annual walkthrough — mock.', 'pending'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_003', 'Glass door alignment (mock)', 'Repair', 'Lobby entrance — mock.', 'in_progress'::"TaskStatus",
  2500, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_004', 'Basement sump pump check (mock)', 'Electrical', 'Awaiting parts — mock.', 'on_hold'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_005', 'Generator weekly log (mock)', 'Maintenance', 'Completed run — mock.', 'completed'::"TaskStatus",
  4000, 1500, 0, 0, 'N/A', NOW(), NOW(), NOW() - INTERVAL '2 days', false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_006', 'CCTV camera 3 offline (mock)', 'Installation', 'Network drop at L1 — mock.', 'pending'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_007', 'Washroom exhaust fan noise (mock)', 'Repair', 'Motor bearing suspected — mock.', 'pending'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_008', 'UPS battery health test (mock)', 'Electrical', 'Load test scheduled — mock.', 'in_progress'::"TaskStatus",
  1200, 800, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_009', 'Parking barrier sensor (mock)', 'Installation', 'Calibration after bump — mock.', 'completed'::"TaskStatus",
  3500, 2200, 500, 0, 'N/A', NOW(), NOW(), NOW() - INTERVAL '5 days', false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT 'mock_lhr_010', 'Water cooler leak tray (mock)', 'Repair', 'Small drip — mock.', 'pending'::"TaskStatus",
  0, 0, 0, 0, 'N/A', NOW(), NOW(), NULL, false, NULL,
  b."id", v."id", 'loc_lahore'
FROM "Branch" b, "Vendor" v
WHERE b."locationId" = 'loc_lahore' AND b."name" = 'L1'
  AND v."locationId" = 'loc_lahore' AND v."name" = 'KS_IT_LHR_VENDOR'
LIMIT 1;
