import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
  // Find booking with code containing 7B7DS
  const booking = await prisma.booking.findFirst({
    where: { 
      bookingCode: { contains: '7B7DS' } 
    },
    include: { 
      payment: true,
      tickets: true,
    },
  });

  if (booking) {
    console.log('=== BOOKING ===');
    console.log('ID:', booking.id);
    console.log('Code:', booking.bookingCode);
    console.log('Status:', booking.status);
    console.log('Payment Status:', booking.paymentStatus);
    console.log('');
    
    if (booking.payment) {
      console.log('=== PAYMENT ===');
      console.log('Order ID:', booking.payment.orderId);
      console.log('Status:', booking.payment.status);
      console.log('Amount:', booking.payment.amount);
      console.log('Midtrans Token:', booking.payment.midtransToken?.substring(0, 20) + '...');
    }
    
    console.log('');
    console.log('=== TICKETS ===');
    console.log('Count:', booking.tickets.length);
    booking.tickets.forEach(t => {
      console.log(`- ${t.ticketCode}: ${t.passengerName}`);
    });
  } else {
    console.log('Booking not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
