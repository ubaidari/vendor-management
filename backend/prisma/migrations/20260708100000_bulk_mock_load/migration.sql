-- Bulk mock load: 300 tasks total so the app looks populated on device.
--   Karachi: 180, Lahore: 60, Islamabad: 60.
-- Tasks are spread across each city's branches (round-robin) and the city vendor,
-- cycling through categories, statuses, and cost values. All marked "(mock)".
-- Applied once (Prisma records the migration); fixed ids keep it deterministic.

INSERT INTO "Task" (
  "id", "title", "category", "description", "status",
  "labourCost", "installationCost", "repairCost", "extraCost", "extraReason",
  "createdAt", "updatedAt", "completedAt", "isDeleted", "deletedAt",
  "branchId", "vendorId", "locationId"
)
SELECT
  'bulk_' || cfg.slug || '_' || lpad(s.n::text, 4, '0'),
  cats.arr[1 + (s.n % array_length(cats.arr, 1))] || ' job #' || s.n || ' (mock)',
  cats.arr[1 + (s.n % array_length(cats.arr, 1))],
  'Auto-generated load-test task — mock data.',
  (ARRAY['pending', 'in_progress', 'on_hold', 'completed']::"TaskStatus"[])[1 + (s.n % 4)],
  (s.n * 100) % 15000,
  (s.n * 60) % 8000,
  (s.n * 40) % 6000,
  (s.n * 25) % 2000,
  CASE WHEN (s.n % 5) = 0 THEN 'After-hours surcharge (mock)' ELSE 'N/A' END,
  NOW() - ((s.n) || ' hours')::interval,
  NOW(),
  CASE WHEN (s.n % 4) = 3 THEN NOW() - ((s.n / 2) || ' hours')::interval ELSE NULL END,
  false,
  NULL,
  bd.branch_id,
  vd.vendor_id,
  cfg.location_id
FROM (VALUES
  ('loc_karachi',   'khi', 180),
  ('loc_lahore',    'lhr', 60),
  ('loc_islamabad', 'isl', 60)
) AS cfg(location_id, slug, cnt)
CROSS JOIN LATERAL generate_series(1, cfg.cnt) AS s(n)
CROSS JOIN (
  SELECT ARRAY['HVAC', 'Electrical', 'Repair', 'Maintenance', 'Installation', 'Safety', 'Plumbing'] AS arr
) AS cats
CROSS JOIN LATERAL (
  SELECT b."id" AS branch_id
  FROM "Branch" b
  WHERE b."locationId" = cfg.location_id
  ORDER BY b."name"
  OFFSET (s.n % GREATEST((SELECT count(*) FROM "Branch" WHERE "locationId" = cfg.location_id), 1))
  LIMIT 1
) AS bd
CROSS JOIN LATERAL (
  SELECT v."id" AS vendor_id
  FROM "Vendor" v
  WHERE v."locationId" = cfg.location_id
  ORDER BY v."name"
  LIMIT 1
) AS vd;
