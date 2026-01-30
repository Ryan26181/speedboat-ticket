import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
  const bookingCode = 'SPD-20260129-B77M8';
  
  // Get booking first
  const existingBooking = await prisma.booking.findUnique({
    where: { bookingCode },
    include: { passengers: true, payment: true }
  });
  
  if (!existingBooking) {
    console.log('Booking not found');
    return;
  }
  
  console.log('Found booking:', existingBooking.id);
  console.log('Current status:', existingBooking.status);
  
  const bookingId = existingBooking.id;
  
  // Update booking to CONFIRMED and payment to SUCCESS
  const result = await prisma.$transaction(async (tx) => {
    // Update payment
    const payment = await tx.payment.update({
      where: { bookingId },
      data: { 
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });

    // Update booking
    const booking = await tx.booking.update({
      where: { bookingCode },
      data: { 
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: { passengers: true, schedule: true },
    });

    // Generate tickets for each passenger
    const tickets = [];
    for (const passenger of booking.passengers) {
      const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const qrData = JSON.stringify({
        ticketCode,
        bookingCode: booking.bookingCode,
        passengerName: passenger.name,
        scheduleId: booking.scheduleId,
      });
      const ticket = await tx.ticket.create({
        data: {
          ticketCode,
          booking: { connect: { id: booking.id } },
          passenger: { connect: { id: passenger.id } },
          qrData,
          status: 'VALID',
        },
      });
      tickets.push({ ...ticket, passengerName: passenger.name });
    }

    return { booking, payment, tickets };
  });

  console.log('=== UPDATE COMPLETE ===');
  console.log('Booking Status:', result.booking.status);
  console.log('Payment Status:', result.payment.status);
  console.log('Tickets Created:', result.tickets.length);
  result.tickets.forEach(t => {
    console.log(`- ${t.ticketCode}: ${t.passengerName}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
