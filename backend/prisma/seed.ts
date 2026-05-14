import { PrismaClient } from "./generated-client/index.js";

const prisma = new PrismaClient();

/**
 * Catalog — keep in sync with `constants/locationCatalog.ts` and `backend/src/*Catalog.ts` in the app.
 * Pins are DB-only (unique constraints); the API does not use them.
 */
const LOCATIONS = [
  { id: "loc_karachi", slug: "karachi", name: "Karachi", adminPin: "0101", vendorPin: "1122" },
  { id: "loc_islamabad", slug: "islamabad", name: "Islamabad", adminPin: "0124", vendorPin: "1144" },
  { id: "loc_lahore", slug: "lahore", name: "Lahore", adminPin: "0123", vendorPin: "1133" }
] as const;

/** C4 = Islamabad only. L1 = Lahore only. Karachi branches do not appear in other cities. */
const BRANCHES_BY_SLUG: Record<(typeof LOCATIONS)[number]["slug"], readonly string[]> = {
  karachi: ["VitalFoakh", "BRR", "Endeavour", "Creekside", "Mega", "Clifton"],
  islamabad: ["C4"],
  lahore: ["L1"]
};

const VENDOR_NAME_BY_SLUG: Record<(typeof LOCATIONS)[number]["slug"], string> = {
  karachi: "KS_IT_KHI_VENDOR",
  lahore: "KS_IT_LHR_VENDOR",
  islamabad: "KS_IT_ISL_VENDOR"
};

async function main(): Promise<void> {
  await prisma.taskEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.location.deleteMany();

  const locationRows = await Promise.all(
    LOCATIONS.map((loc) =>
      prisma.location.create({
        data: {
          id: loc.id,
          slug: loc.slug,
          name: loc.name,
          adminPin: loc.adminPin,
          vendorPin: loc.vendorPin
        }
      })
    )
  );

  for (const loc of locationRows) {
    const branchNames = BRANCHES_BY_SLUG[loc.slug as keyof typeof BRANCHES_BY_SLUG];
    for (const name of branchNames) {
      await prisma.branch.create({
        data: { name, locationId: loc.id }
      });
    }

    const vendorName = VENDOR_NAME_BY_SLUG[loc.slug as keyof typeof VENDOR_NAME_BY_SLUG];
    await prisma.vendor.create({
      data: { name: vendorName, locationId: loc.id }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
