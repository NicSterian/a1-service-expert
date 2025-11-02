-- Add BOOKING_REFERENCE to SequenceKey enum
ALTER TYPE "SequenceKey" ADD VALUE IF NOT EXISTS 'BOOKING_REFERENCE';

-- Add reference column to Booking with unique constraint
ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "reference" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_reference_key" ON "Booking"("reference");
