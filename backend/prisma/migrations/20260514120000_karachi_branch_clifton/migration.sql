-- Karachi-only branch "Clifton". Idempotent: skips if already present (unique on locationId + name).
INSERT INTO "Branch" ("id", "name", "locationId")
SELECT
  'br_loc_karachi_clifton',
  'Clifton',
  l."id"
FROM "Location" l
WHERE l."slug" = 'karachi'
  AND NOT EXISTS (
    SELECT 1 FROM "Branch" b WHERE b."locationId" = l."id" AND b."name" = 'Clifton'
  );
