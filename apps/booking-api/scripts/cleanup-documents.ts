#!/usr/bin/env ts-node
/**
 * Cleanup Script for Test Documents
 *
 * This script removes booking-linked documents and optionally resets
 * invoice/quote/booking-reference sequences for the current year.
 *
 * Usage:
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-documents.ts [options]
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --force      Skip confirmation prompt
 *   --all        Delete ALL documents (including non-booking-linked)
 *
 * Examples:
 *   # Preview what will be deleted
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-documents.ts --dry-run
 *
 *   # Delete booking-linked documents with confirmation
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-documents.ts
 *
 *   # Delete all documents without confirmation
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-documents.ts --all --force
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

interface Options {
  dryRun: boolean;
  force: boolean;
  all: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    all: args.includes('--all'),
  };
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const options = parseArgs();

  console.log('🔍 Cleanup Documents Script');
  console.log('============================\n');

  if (options.dryRun) {
    console.log('🚀 DRY RUN MODE - No changes will be made\n');
  }

  // Count documents to be deleted
  const where = options.all ? {} : { bookingId: { not: null } };
  const documentCount = await prisma.document.count({
    where,
  });

  console.log(`📊 Found ${documentCount} document(s) to delete`);

  if (options.all) {
    console.log('⚠️  WARNING: --all flag detected. This will delete ALL documents!');
  } else {
    console.log('ℹ️  Deleting only booking-linked documents');
  }

  // Show breakdown by type
  const invoiceCount = await prisma.document.count({
    where: { ...where, type: 'INVOICE' },
  });
  const quoteCount = await prisma.document.count({
    where: { ...where, type: 'QUOTE' },
  });

  console.log(`  - Invoices: ${invoiceCount}`);
  console.log(`  - Quotes: ${quoteCount}`);
  console.log('');

  if (documentCount === 0) {
    console.log('✅ No documents to delete');
    await prisma.$disconnect();
    return;
  }

  if (options.dryRun) {
    console.log('ℹ️  Dry run complete. Run without --dry-run to execute deletion.');
    await prisma.$disconnect();
    return;
  }

  // Confirm deletion
  if (!options.force) {
    const confirmed = await confirm('⚠️  Proceed with deletion?');
    if (!confirmed) {
      console.log('❌ Deletion cancelled');
      await prisma.$disconnect();
      return;
    }
  }

  // Delete documents
  console.log('🗑️  Deleting documents...');
  const deleteResult = await prisma.document.deleteMany({
    where,
  });
  console.log(`✅ Deleted ${deleteResult.count} document(s)`);

  // Reset sequences for current year
  const currentYear = new Date().getFullYear();
  console.log(`\n🔄 Resetting sequences for year ${currentYear}...`);

  const sequenceKeys = ['INVOICE', 'QUOTE', 'BOOKING_REFERENCE'] as const;

  for (const key of sequenceKeys) {
    const result = await prisma.sequence.updateMany({
      where: {
        key,
        year: currentYear,
      },
      data: {
        counter: 0,
      },
    });

    if (result.count > 0) {
      console.log(`  ✅ Reset ${key} counter for ${currentYear}`);
    } else {
      // Create if doesn't exist
      await prisma.sequence.upsert({
        where: {
          key_year: { key, year: currentYear },
        },
        create: {
          key,
          year: currentYear,
          counter: 0,
        },
        update: {
          counter: 0,
        },
      });
      console.log(`  ✅ Created and reset ${key} counter for ${currentYear}`);
    }
  }

  console.log('\n✨ Cleanup complete!');
  console.log('\n📝 Recommendations:');
  console.log('  - Consider using a separate dev/test database for experiments');
  console.log('  - Test data should be clearly marked to avoid future cleanup confusion');

  await prisma.$disconnect();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during cleanup:');
    console.error(error);
    process.exit(1);
  });
