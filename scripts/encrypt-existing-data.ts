/**
 * Encrypt Existing Data Migration Script
 * 
 * Migrates unencrypted data to encrypted format for:
 * - User phone numbers
 * - Passenger ID numbers  
 * - Payment VA numbers
 * 
 * Run with: npx tsx scripts/encrypt-existing-data.ts
 * 
 * IMPORTANT: 
 * - Set ENCRYPTION_KEY before running
 * - Backup database before running
 * - Run during maintenance window
 */

import { PrismaClient } from '@prisma/client';
import { 
  encryptPhone, 
  encryptIdNumber, 
  encryptPaymentDetail,
  isEncrypted,
  validateEncryptionSetup,
} from '../src/lib/encryption';

const prisma = new PrismaClient();

interface MigrationStats {
  users: { processed: number; encrypted: number; skipped: number; errors: number };
  passengers: { processed: number; encrypted: number; skipped: number; errors: number };
  payments: { processed: number; encrypted: number; skipped: number; errors: number };
}

async function encryptExistingData(): Promise<MigrationStats> {
  console.log('🔐 Starting data encryption migration...\n');
  
  // Validate encryption setup
  const validation = validateEncryptionSetup();
  if (!validation.valid) {
    throw new Error(`Encryption setup invalid: ${validation.error}`);
  }
  console.log('✅ Encryption key validated\n');
  
  const stats: MigrationStats = {
    users: { processed: 0, encrypted: 0, skipped: 0, errors: 0 },
    passengers: { processed: 0, encrypted: 0, skipped: 0, errors: 0 },
    payments: { processed: 0, encrypted: 0, skipped: 0, errors: 0 },
  };

  // Encrypt user phone numbers
  console.log('📱 Encrypting user phone numbers...');
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  for (const user of users) {
    stats.users.processed++;
    
    if (!user.phone) {
      stats.users.skipped++;
      continue;
    }

    // Skip already encrypted
    if (isEncrypted(user.phone)) {
      stats.users.skipped++;
      continue;
    }

    try {
      const { encrypted, hash } = encryptPhone(user.phone);
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          phone: encrypted,
          // phoneHash: hash, // Add this field if you have it in schema
        },
      });
      stats.users.encrypted++;
    } catch (error) {
      console.error(`  ❌ Failed to encrypt user ${user.id}:`, error);
      stats.users.errors++;
    }
  }
  console.log(`  ✅ Users: ${stats.users.encrypted} encrypted, ${stats.users.skipped} skipped, ${stats.users.errors} errors\n`);

  // Encrypt passenger ID numbers
  console.log('🪪 Encrypting passenger ID numbers...');
  const passengers = await prisma.passenger.findMany({
    select: { id: true, identityNumber: true },
  });

  for (const passenger of passengers) {
    stats.passengers.processed++;

    if (!passenger.identityNumber) {
      stats.passengers.skipped++;
      continue;
    }

    // Skip already encrypted
    if (isEncrypted(passenger.identityNumber)) {
      stats.passengers.skipped++;
      continue;
    }

    try {
      const { encrypted } = encryptIdNumber(passenger.identityNumber);
      await prisma.passenger.update({
        where: { id: passenger.id },
        data: { 
          identityNumber: encrypted,
        },
      });
      stats.passengers.encrypted++;
    } catch (error) {
      console.error(`  ❌ Failed to encrypt passenger ${passenger.id}:`, error);
      stats.passengers.errors++;
    }
  }
  console.log(`  ✅ Passengers: ${stats.passengers.encrypted} encrypted, ${stats.passengers.skipped} skipped, ${stats.passengers.errors} errors\n`);

  // Encrypt payment VA numbers
  console.log('💳 Encrypting payment VA numbers...');
  const payments = await prisma.payment.findMany({
    select: { id: true, vaNumber: true },
  });

  for (const payment of payments) {
    stats.payments.processed++;

    if (!payment.vaNumber) {
      stats.payments.skipped++;
      continue;
    }

    // Skip already encrypted
    if (isEncrypted(payment.vaNumber)) {
      stats.payments.skipped++;
      continue;
    }

    try {
      const encrypted = encryptPaymentDetail(payment.vaNumber);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { vaNumber: encrypted },
      });
      stats.payments.encrypted++;
    } catch (error) {
      console.error(`  ❌ Failed to encrypt payment ${payment.id}:`, error);
      stats.payments.errors++;
    }
  }
  console.log(`  ✅ Payments: ${stats.payments.encrypted} encrypted, ${stats.payments.skipped} skipped, ${stats.payments.errors} errors\n`);

  return stats;
}

async function main() {
  try {
    const stats = await encryptExistingData();
    
    console.log('📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Users:      ${stats.users.encrypted}/${stats.users.processed} encrypted`);
    console.log(`Passengers: ${stats.passengers.encrypted}/${stats.passengers.processed} encrypted`);
    console.log(`Payments:   ${stats.payments.encrypted}/${stats.payments.processed} encrypted`);
    console.log('═══════════════════════════════════════');
    
    const totalErrors = stats.users.errors + stats.passengers.errors + stats.payments.errors;
    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} errors occurred during migration. Check logs above.`);
      process.exit(1);
    } else {
      console.log('\n✅ Data encryption migration completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
