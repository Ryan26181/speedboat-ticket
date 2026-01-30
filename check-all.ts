import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { payment: true, tickets: true }
  });
  
  bookings.forEach(b => {
    console.log('---');
    console.log('Code:', b.bookingCode);
    console.log('Status:', b.status);
    console.log('Payment:', b.payment?.status);
    console.log('OrderId:', b.payment?.orderId);
    console.log('Tickets:', b.tickets?.length);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
