-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'SENT';
ALTER TYPE "DocumentStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "DocumentStatus" ADD VALUE 'DECLINED';
ALTER TYPE "DocumentStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "DocumentStatus" ADD VALUE 'PAID';

-- DropForeignKey
ALTER TABLE "BookingService" DROP CONSTRAINT "BookingService_engineTierId_fkey";

-- DropForeignKey
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
ALTER COLUMN "acceptedTermsAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "userId" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "pricingMode" SET DEFAULT 'TIERED';

-- AlterTable
ALTER TABLE "ServicePrice" ALTER COLUMN "engineTierId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "profileUpdatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserSession" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "Booking_slotDate_idx" ON "Booking"("slotDate");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_source_idx" ON "Booking"("source");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_engineTierId_fkey" FOREIGN KEY ("engineTierId") REFERENCES "EngineTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
