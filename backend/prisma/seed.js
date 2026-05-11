"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const branchNames = [
    "Ks_Johar",
    "Ks_Endeavour",
    "Ks_Vital foakh",
    "Ks_Brr",
    "Ks_Clifton",
    "Ks_Creekside"
];
const vendorNames = [
    "BluePeak Technical Services",
    "NovaFix Engineering",
    "Prime Facility Works",
    "Urban Grid Solutions",
    "Apex Maintenance Co.",
    "MetroCraft Installations"
];
const tasksSeed = [
    {
        title: "HVAC compressor inspection and calibration",
        branch: "Ks_Johar",
        category: "HVAC",
        status: client_1.TaskStatus.in_progress,
        vendor: "BluePeak Technical Services",
        labourCost: 12000,
        installationCost: 3500,
        repairCost: 4200,
        extraCost: 900,
        extraReason: "Replacement of worn insulation tape"
    },
    {
        title: "Main signage LED panel replacement",
        branch: "Ks_Endeavour",
        category: "Electrical",
        status: client_1.TaskStatus.pending,
        vendor: "Urban Grid Solutions",
        labourCost: 8000,
        installationCost: 6200,
        repairCost: 0,
        extraCost: 600,
        extraReason: "After-hours installation window surcharge"
    },
    {
        title: "Cold storage door hinge repair",
        branch: "Ks_Vital foakh",
        category: "Repair",
        status: client_1.TaskStatus.completed,
        vendor: "NovaFix Engineering",
        labourCost: 5400,
        installationCost: 0,
        repairCost: 2600,
        extraCost: 0,
        extraReason: "N/A"
    }
];
async function main() {
    await prisma.task.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.vendor.deleteMany();
    const branchMap = new Map();
    const vendorMap = new Map();
    for (const name of branchNames) {
        const branch = await prisma.branch.create({ data: { name } });
        branchMap.set(name, branch.id);
    }
    for (const name of vendorNames) {
        const vendor = await prisma.vendor.create({ data: { name } });
        vendorMap.set(name, vendor.id);
    }
    for (const task of tasksSeed) {
        await prisma.task.create({
            data: {
                title: task.title,
                category: task.category,
                description: "N/A",
                status: task.status,
                labourCost: task.labourCost,
                installationCost: task.installationCost,
                repairCost: task.repairCost,
                extraCost: task.extraCost,
                extraReason: task.extraReason,
                branchId: branchMap.get(task.branch),
                vendorId: vendorMap.get(task.vendor)
            }
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
