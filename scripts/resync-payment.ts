// Script to resync payment status from Midtrans
// Run with: npx tsx scripts/resync-payment.ts BOOKING_CODE

import { resyncBookingStatus } from '../src/lib/webhook-retry';

async function main() {
  const bookingCode = process.argv[2] || 'SPD-20260129-7B7DS';
  
  console.log(`Resyncing booking: ${bookingCode}`);
  
  const result = await resyncBookingStatus(bookingCode);
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
