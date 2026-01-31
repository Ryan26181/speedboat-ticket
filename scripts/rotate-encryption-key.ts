/**
 * Encryption Key Rotation Script
 * 
 * Re-encrypts all data with a new encryption key.
 * 
 * Usage:
 * 1. Set OLD_ENCRYPTION_KEY to current key
 * 2. Set ENCRYPTION_KEY to new key
 * 3. Run: npx tsx scripts/rotate-encryption-key.ts
 * 4. Update .env with new ENCRYPTION_KEY
 * 
 * IMPORTANT:
 * - Backup database before running
 * - Run during maintenance window
 * - Update all environment variables after successful rotation
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Key derivation constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

type KeyPurpose = 'user:phone' | 'passenger:idNumber' | 'payment:details';

function deriveKey(masterKey: string, purpose: KeyPurpose): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(masterKey, 'base64'),
      Buffer.from('speedboat-ticket-salt'),
      Buffer.from(purpose),
      KEY_LENGTH
    )
  );
}

function decryptWithKey(ciphertext: string, key: Buffer): string {
  if (!ciphertext || !ciphertext.includes(':')) {
    return ciphertext;
  }

  const [ivBase64, authTagBase64, encryptedBase64] = ciphertext.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  if (!plaintext) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

interface RotationStats {
  users: { processed: number; rotated: number; errors: number };
  passengers: { processed: number; rotated: number; errors: number };
  payments: { processed: number; rotated: number; errors: number };
}

async function rotateKeys(): Promise<RotationStats> {
  const oldKey = process.env.OLD_ENCRYPTION_KEY;
  const newKey = process.env.ENCRYPTION_KEY;

  if (!oldKey) {
    throw new Error('OLD_ENCRYPTION_KEY environment variable is required');
  }
  if (!newKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  if (oldKey === newKey) {
    throw new Error('OLD_ENCRYPTION_KEY and ENCRYPTION_KEY must be different');
  }

  console.log('🔄 Starting encryption key rotation...\n');

  const stats: RotationStats = {
    users: { processed: 0, rotated: 0, errors: 0 },
    passengers: { processed: 0, rotated: 0, errors: 0 },
    payments: { processed: 0, rotated: 0, errors: 0 },
  };

  // Rotate user phone numbers
  console.log('📱 Rotating user phone encryption...');
  const oldUserKey = deriveKey(oldKey, 'user:phone');
  const newUserKey = deriveKey(newKey, 'user:phone');
  
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  for (const user of users) {
    stats.users.processed++;
    if (!user.phone?.includes(':')) continue;

    try {
      const decrypted = decryptWithKey(user.phone, oldUserKey);
      const encrypted = encryptWithKey(decrypted, newUserKey);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: encrypted },
      });
      stats.users.rotated++;
    } catch (error) {
      console.error(`  ❌ Failed to rotate user ${user.id}:`, error);
      stats.users.errors++;
    }
  }
  console.log(`  ✅ Users: ${stats.users.rotated}/${stats.users.processed} rotated\n`);

  // Rotate passenger ID numbers
  console.log('🪪 Rotating passenger ID encryption...');
  const oldPassengerKey = deriveKey(oldKey, 'passenger:idNumber');
  const newPassengerKey = deriveKey(newKey, 'passenger:idNumber');
  
  const passengers = await prisma.passenger.findMany({
    select: { id: true, identityNumber: true },
  });

  for (const passenger of passengers) {
    stats.passengers.processed++;
    if (!passenger.identityNumber?.includes(':')) continue;

    try {
      const decrypted = decryptWithKey(passenger.identityNumber, oldPassengerKey);
      const encrypted = encryptWithKey(decrypted, newPassengerKey);
      
      await prisma.passenger.update({
        where: { id: passenger.id },
        data: { identityNumber: encrypted },
      });
      stats.passengers.rotated++;
    } catch (error) {
      console.error(`  ❌ Failed to rotate passenger ${passenger.id}:`, error);
      stats.passengers.errors++;
    }
  }
  console.log(`  ✅ Passengers: ${stats.passengers.rotated}/${stats.passengers.processed} rotated\n`);

  // Rotate payment VA numbers
  console.log('💳 Rotating payment encryption...');
  const oldPaymentKey = deriveKey(oldKey, 'payment:details');
  const newPaymentKey = deriveKey(newKey, 'payment:details');
  
  const payments = await prisma.payment.findMany({
    select: { id: true, vaNumber: true },
  });

  for (const payment of payments) {
    stats.payments.processed++;
    if (!payment.vaNumber?.includes(':')) continue;

    try {
      const decrypted = decryptWithKey(payment.vaNumber, oldPaymentKey);
      const encrypted = encryptWithKey(decrypted, newPaymentKey);
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: { vaNumber: encrypted },
      });
      stats.payments.rotated++;
    } catch (error) {
      console.error(`  ❌ Failed to rotate payment ${payment.id}:`, error);
      stats.payments.errors++;
    }
  }
  console.log(`  ✅ Payments: ${stats.payments.rotated}/${stats.payments.processed} rotated\n`);

  return stats;
}

async function main() {
  try {
    const stats = await rotateKeys();
    
    console.log('📊 Rotation Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Users:      ${stats.users.rotated}/${stats.users.processed} rotated`);
    console.log(`Passengers: ${stats.passengers.rotated}/${stats.passengers.processed} rotated`);
    console.log(`Payments:   ${stats.payments.rotated}/${stats.payments.processed} rotated`);
    console.log('═══════════════════════════════════════');
    
    const totalErrors = stats.users.errors + stats.passengers.errors + stats.payments.errors;
    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} errors occurred. Check logs above.`);
      console.log('⚠️  Some data may still use the old key!');
      process.exit(1);
    } else {
      console.log('\n✅ Key rotation completed successfully!');
      console.log('🔑 Remember to update ENCRYPTION_KEY in all environments.');
    }
  } catch (error) {
    console.error('\n❌ Key rotation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
