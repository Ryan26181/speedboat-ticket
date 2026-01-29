import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Load environment variables
config();

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Create Admin User
  console.log("Creating admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@speedboat.com" },
    update: {},
    create: {
      email: "admin@speedboat.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Admin user created: ${adminUser.email}`);

  // Clear existing data (optional - uncomment if needed)
  // console.log("Clearing existing data...");
  // await prisma.ticket.deleteMany();
  // await prisma.passenger.deleteMany();
  // await prisma.booking.deleteMany();
  // await prisma.schedule.deleteMany();
  // await prisma.route.deleteMany();
  // await prisma.ship.deleteMany();
  // await prisma.port.deleteMany();

  // Create Ports
  console.log("Creating ports...");
  const portMerak = await prisma.port.upsert({
    where: { code: "MRK" },
    update: {},
    create: {
      name: "Pelabuhan Merak",
      code: "MRK",
      city: "Cilegon",
      province: "Banten",
      address: "Jl. Raya Pelabuhan Merak, Cilegon",
    },
  });

  const portBakauheni = await prisma.port.upsert({
    where: { code: "BKH" },
    update: {},
    create: {
      name: "Pelabuhan Bakauheni",
      code: "BKH",
      city: "Lampung Selatan",
      province: "Lampung",
      address: "Jl. Raya Bakauheni, Lampung Selatan",
    },
  });

  const portKetapang = await prisma.port.upsert({
    where: { code: "KTP" },
    update: {},
    create: {
      name: "Pelabuhan Ketapang",
      code: "KTP",
      city: "Banyuwangi",
      province: "Jawa Timur",
      address: "Jl. Pelabuhan Ketapang, Banyuwangi",
    },
  });

  const portGilimanuk = await prisma.port.upsert({
    where: { code: "GLM" },
    update: {},
    create: {
      name: "Pelabuhan Gilimanuk",
      code: "GLM",
      city: "Jembrana",
      province: "Bali",
      address: "Jl. Pelabuhan Gilimanuk, Jembrana",
    },
  });

  const portPadangbai = await prisma.port.upsert({
    where: { code: "PDB" },
    update: {},
    create: {
      name: "Pelabuhan Padangbai",
      code: "PDB",
      city: "Karangasem",
      province: "Bali",
      address: "Jl. Pelabuhan Padangbai, Karangasem",
    },
  });

  const portLembar = await prisma.port.upsert({
    where: { code: "LBR" },
    update: {},
    create: {
      name: "Pelabuhan Lembar",
      code: "LBR",
      city: "Lombok Barat",
      province: "Nusa Tenggara Barat",
      address: "Jl. Pelabuhan Lembar, Lombok Barat",
    },
  });

  console.log(`  ✓ Created ${6} ports`);

  // Create Ships
  console.log("\nCreating ships...");
  const shipExpress1 = await prisma.ship.upsert({
    where: { code: "SPD-001" },
    update: {},
    create: {
      name: "KM Speedboat Express I",
      code: "SPD-001",
      capacity: 50,
      facilities: ["AC", "WiFi", "Toilet", "Life Jacket", "First Aid"],
      description: "Modern high-speed passenger vessel with comfortable seating",
      status: "ACTIVE",
    },
  });

  const shipExpress2 = await prisma.ship.upsert({
    where: { code: "SPD-002" },
    update: {},
    create: {
      name: "KM Speedboat Express II",
      code: "SPD-002",
      capacity: 75,
      facilities: ["AC", "WiFi", "Toilet", "Life Jacket", "First Aid", "Snack Bar"],
      description: "Large capacity speedboat with premium amenities",
      status: "ACTIVE",
    },
  });

  const shipFast1 = await prisma.ship.upsert({
    where: { code: "FST-001" },
    update: {},
    create: {
      name: "KM Fast Ferry I",
      code: "FST-001",
      capacity: 100,
      facilities: ["AC", "WiFi", "Toilet", "Life Jacket", "First Aid", "Canteen", "VIP Lounge"],
      description: "Premium fast ferry with VIP accommodations",
      status: "ACTIVE",
    },
  });

  const shipCoastal1 = await prisma.ship.upsert({
    where: { code: "CST-001" },
    update: {},
    create: {
      name: "KM Coastal Runner",
      code: "CST-001",
      capacity: 40,
      facilities: ["AC", "Toilet", "Life Jacket", "First Aid"],
      description: "Compact speedboat for short coastal routes",
      status: "ACTIVE",
    },
  });

  console.log(`  ✓ Created ${4} ships`);

  // Create Routes
  console.log("\nCreating routes...");
  const routeMerakBakauheni = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portMerak.id,
        arrivalPortId: portBakauheni.id,
      },
    },
    update: {},
    create: {
      departurePortId: portMerak.id,
      arrivalPortId: portBakauheni.id,
      distance: 30,
      estimatedDuration: 90,
      basePrice: 150000,
      status: "ACTIVE",
    },
  });

  const routeBakauheniMerak = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portBakauheni.id,
        arrivalPortId: portMerak.id,
      },
    },
    update: {},
    create: {
      departurePortId: portBakauheni.id,
      arrivalPortId: portMerak.id,
      distance: 30,
      estimatedDuration: 90,
      basePrice: 150000,
      status: "ACTIVE",
    },
  });

  const routeKetapangGilimanuk = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portKetapang.id,
        arrivalPortId: portGilimanuk.id,
      },
    },
    update: {},
    create: {
      departurePortId: portKetapang.id,
      arrivalPortId: portGilimanuk.id,
      distance: 10,
      estimatedDuration: 45,
      basePrice: 75000,
      status: "ACTIVE",
    },
  });

  const routeGilimanukKetapang = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portGilimanuk.id,
        arrivalPortId: portKetapang.id,
      },
    },
    update: {},
    create: {
      departurePortId: portGilimanuk.id,
      arrivalPortId: portKetapang.id,
      distance: 10,
      estimatedDuration: 45,
      basePrice: 75000,
      status: "ACTIVE",
    },
  });

  const routePadangbaiLembar = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portPadangbai.id,
        arrivalPortId: portLembar.id,
      },
    },
    update: {},
    create: {
      departurePortId: portPadangbai.id,
      arrivalPortId: portLembar.id,
      distance: 60,
      estimatedDuration: 120,
      basePrice: 200000,
      status: "ACTIVE",
    },
  });

  const routeLembarPadangbai = await prisma.route.upsert({
    where: {
      departurePortId_arrivalPortId: {
        departurePortId: portLembar.id,
        arrivalPortId: portPadangbai.id,
      },
    },
    update: {},
    create: {
      departurePortId: portLembar.id,
      arrivalPortId: portPadangbai.id,
      distance: 60,
      estimatedDuration: 120,
      basePrice: 200000,
      status: "ACTIVE",
    },
  });

  console.log(`  ✓ Created ${6} routes`);

  // Create Schedules for the next 7 days
  console.log("\nCreating schedules...");
  let scheduleCount = 0;

  const scheduleConfigs = [
    // Merak - Bakauheni
    { route: routeMerakBakauheni, ship: shipExpress1, times: ["06:00", "09:00", "12:00", "15:00", "18:00"] },
    { route: routeMerakBakauheni, ship: shipFast1, times: ["07:30", "13:30", "19:30"] },
    // Bakauheni - Merak
    { route: routeBakauheniMerak, ship: shipExpress1, times: ["07:30", "10:30", "13:30", "16:30", "19:30"] },
    { route: routeBakauheniMerak, ship: shipFast1, times: ["09:00", "15:00", "21:00"] },
    // Ketapang - Gilimanuk
    { route: routeKetapangGilimanuk, ship: shipCoastal1, times: ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"] },
    { route: routeGilimanukKetapang, ship: shipCoastal1, times: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"] },
    // Padangbai - Lembar
    { route: routePadangbaiLembar, ship: shipExpress2, times: ["08:00", "13:00", "18:00"] },
    { route: routeLembarPadangbai, ship: shipExpress2, times: ["10:30", "15:30", "20:30"] },
  ];

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    for (const config of scheduleConfigs) {
      for (const time of config.times) {
        const [hours, minutes] = time.split(":").map(Number);
        
        const departureTime = new Date(date);
        departureTime.setHours(hours, minutes, 0, 0);
        
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + config.route.estimatedDuration);

        // Check if schedule already exists
        const existing = await prisma.schedule.findFirst({
          where: {
            routeId: config.route.id,
            shipId: config.ship.id,
            departureTime: departureTime,
          },
        });

        if (!existing) {
          await prisma.schedule.create({
            data: {
              routeId: config.route.id,
              shipId: config.ship.id,
              departureTime: departureTime,
              arrivalTime: arrivalTime,
              price: config.route.basePrice,
              totalSeats: config.ship.capacity,
              availableSeats: config.ship.capacity,
              status: "SCHEDULED",
            },
          });
          scheduleCount++;
        }
      }
    }
  }

  console.log(`  ✓ Created ${scheduleCount} schedules`);

  // Summary
  console.log("\n✅ Database seed completed!");
  console.log("\n📊 Summary:");
  console.log(`   - Admin User: admin@speedboat.com (password: admin123)`);
  console.log(`   - Ports: 6`);
  console.log(`   - Ships: 4`);
  console.log(`   - Routes: 6`);
  console.log(`   - Schedules: ${scheduleCount}`);
  
  console.log("\n📍 Available Routes:");
  console.log("   - Merak ↔ Bakauheni (Rp 150.000)");
  console.log("   - Ketapang ↔ Gilimanuk (Rp 75.000)");
  console.log("   - Padangbai ↔ Lembar (Rp 200.000)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
