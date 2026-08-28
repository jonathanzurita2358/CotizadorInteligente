import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const laserConfig = {
  machineCostPerMinute: 0.12,
  electricityKw: 0.06,
  costPerKwh: 0.1,
  laborRatePerHour: 4.5,
  laborMinutes: 5,
  maintenanceMonthlyCost: 15,
  maintenanceMonthlyHours: 80,
  wastePercentOverMaterials: 3,
  prepOptions: [
    { id: "ready_file", label: "Archivo listo", cost: 0 },
    { id: "cleanup", label: "Limpieza de archivo", cost: 2 },
    { id: "vectorization", label: "Vectorización", cost: 4 },
    { id: "from_scratch", label: "Diseño desde cero", cost: 8 },
  ],
  extraSeconds: {
    costPerSecond: 0.002,
    includedSeconds: 180,
  },
  secondsPerCm2: 15,
  volumeDiscounts: [
    { minQty: 10, discountPercent: 5 },
    { minQty: 25, discountPercent: 10 },
    { minQty: 50, discountPercent: 15 },
  ],
};

async function main() {
  await prisma.globalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      currency: "USD",
      margins: {
        minimumPct: 35,
        recommendedPct: 60,
        premiumPct: 90,
      },
      rounding: {
        mode: "up",
        step: 0.25,
      },
    },
  });

  await prisma.technique.upsert({
    where: { slug: "grabado-laser" },
    update: {},
    create: {
      slug: "grabado-laser",
      name: "Grabado láser",
      active: true,
      config: laserConfig,
    },
  });

  for (const slug of ["sublimacion", "dtf", "uv-dtf", "vinil", "resina"]) {
    await prisma.technique.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name:
          slug === "sublimacion"
            ? "Sublimación"
            : slug === "uv-dtf"
              ? "UV DTF"
              : slug.charAt(0).toUpperCase() + slug.slice(1),
        active: false,
        config: laserConfig,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
