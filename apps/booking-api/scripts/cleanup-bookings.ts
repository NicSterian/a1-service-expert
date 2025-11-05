#!/usr/bin/env ts-node
/**
 * Cleanup Script for Test Bookings
 *
 * This script removes bookings and optionally their related records
 * (documents, booking services, etc.) and resets sequences.
 *
 * Usage:
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-bookings.ts [options]
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --force      Skip confirmation prompt
 *   --all        Delete ALL bookings (use with extreme caution!)
 *   --status     Filter by status (e.g., --status=DRAFT,CANCELLED)
 *
 * Examples:
 *   # Preview what will be deleted
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-bookings.ts --dry-run
 *
 *   # Delete draft and cancelled bookings
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-bookings.ts --status=DRAFT,CANCELLED
 *
 *   # Delete all bookings without confirmation (DANGEROUS!)
 *   pnpm --filter booking-api exec ts-node scripts/cleanup-bookings.ts --all --force
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

interface Options {
  dryRun: boolean;
  force: boolean;
  all: boolean;
  status: string[];
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const statusArg = args.find((arg) => arg.startsWith('--status='));
  const status = statusArg ? statusArg.split('=')[1].split(',') : [];

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    all: args.includes('--all'),
    status,
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

  console.log('🔍 Cleanup Bookings Script');
  console.log('============================\n');

  if (options.dryRun) {
    console.log('🚀 DRY RUN MODE - No changes will be made\n');
  }

  // Build where clause
  const where: any = {};
  if (options.status.length > 0) {
    where.status = { in: options.status };
  }

  // Count bookings to be deleted
  const bookingCount = await prisma.booking.count({ where });

  console.log(`📊 Found ${bookingCount} booking(s) to delete`);

  if (options.all && options.status.length === 0) {
    console.log('⚠️  WARNING: --all flag detected. This will delete ALL bookings!');
  } else if (options.status.length > 0) {
    console.log(`ℹ️  Filtering by status: ${options.status.join(', ')}`);
  }

  // Show breakdown by status
  const statusCounts = await prisma.booking.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  console.log('\n📋 Breakdown by status:');
  for (const item of statusCounts) {
    console.log(`  - ${item.status}: ${item._count}`);
  }
  console.log('');

  if (bookingCount === 0) {
    console.log('✅ No bookings to delete');
    await prisma.$disconnect();
    return;
  }

  // Count related records
  const bookingIds = (await prisma.booking.findMany({ where, select: { id: true } })).map((b) => b.id);
  const documentsCount = await prisma.document.count({
    where: { bookingId: { in: bookingIds } },
  });
  const servicesCount = await prisma.bookingService.count({
    where: { bookingId: { in: bookingIds } },
  });

  console.log('📦 Related records that will also be deleted:');
  console.log(`  - Documents (invoices/quotes): ${documentsCount}`);
  console.log(`  - Booking services: ${servicesCount}`);
  console.log('');

  if (options.dryRun) {
    console.log('ℹ️  Dry run complete. Run without --dry-run to execute deletion.');
    await prisma.$disconnect();
    return;
  }

  // Confirm deletion
  if (!options.force) {
    console.log('⚠️  This will permanently delete:');
    console.log(`   - ${bookingCount} booking(s)`);
    console.log(`   - ${documentsCount} document(s)`);
    console.log(`   - ${servicesCount} booking service(s)`);
    console.log('');
    const confirmed = await confirm('⚠️  Proceed with deletion?');
    if (!confirmed) {
      console.log('❌ Deletion cancelled');
      await prisma.$disconnect();
      return;
    }
  }

  // Delete in transaction (respecting foreign key constraints)
  console.log('🗑️  Deleting bookings and related records...');

  await prisma.$transaction(async (tx) => {
    // Delete documents first (they reference bookings)
    const deletedDocs = await tx.document.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    console.log(`  ✅ Deleted ${deletedDocs.count} document(s)`);

    // Delete booking services
    const deletedServices = await tx.bookingService.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    console.log(`  ✅ Deleted ${deletedServices.count} booking service(s)`);

    // Finally delete bookings
    const deletedBookings = await tx.booking.deleteMany({ where });
    console.log(`  ✅ Deleted ${deletedBookings.count} booking(s)`);
  });

  // Reset sequences for current year
  const currentYear = new Date().getFullYear();
  console.log(`\n🔄 Resetting sequences for year ${currentYear}...`);

  const sequenceKeys = ['INVOICE', 'QUOTE', 'BOOKING_REFERENCE'] as const;

  for (const key of sequenceKeys) {
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
    console.log(`  ✅ Reset ${key} counter for ${currentYear}`);
  }

  console.log('\n✨ Cleanup complete!');
  console.log('\n📝 Recommendations:');
  console.log('  - Use --status=DRAFT,CANCELLED to clean up test bookings');
  console.log('  - Consider using a separate dev/test database for experiments');
  console.log('  - Completed bookings with invoices should typically be preserved for records');

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
