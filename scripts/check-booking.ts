import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Load environment variables
config();

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function checkBooking() {
  try {
    // Get ALL bookings with all related data
    const bookings = await prisma.booking.findMany({
      include: {
        passengers: {
          include: {
            ticket: true,
          },
        },
        payment: true,
        user: {
          select: { email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (bookings.length === 0) {
      console.log("No bookings found");
      return;
    }

    console.log(`\n=== FOUND ${bookings.length} BOOKINGS ===\n`);

    for (const booking of bookings) {
      console.log("\n=== BOOKING ===");
      console.log("Booking Code:", booking.bookingCode);
      console.log("Status:", booking.status);
      console.log("User Email:", booking.user.email);
      console.log("Total Passengers:", booking.totalPassengers);
      console.log("Created At:", booking.createdAt);

      console.log("\n  Passengers:");
      booking.passengers.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.name || "(EMPTY NAME)"} - ${p.identityNumber} - Ticket: ${p.ticket ? "YES" : "NO"}`);
      });

      console.log("\n  Payment:");
      if (booking.payment) {
        console.log(`    Status: ${booking.payment.status}, Paid: ${booking.payment.paidAt}`);
      } else {
        console.log("    No payment record");
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();
