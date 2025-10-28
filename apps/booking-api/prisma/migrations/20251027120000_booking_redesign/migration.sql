-- CreateEnum
CREATE TYPE "ServicePricingMode" AS ENUM ('TIERED', 'FIXED');

-- AlterTable
ALTER TABLE "Service"
  ADD COLUMN     "pricingMode" "ServicePricingMode" NOT NULL DEFAULT 'TIERED',
  ADD COLUMN     "fixedPricePence" INTEGER,
  ADD COLUMN     "footnotes" TEXT;

ALTER TABLE "Service"
  ALTER COLUMN "pricingMode" DROP DEFAULT;

ALTER TABLE "Settings"
  ADD COLUMN     "captchaEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "captchaRequireInDev" BOOLEAN NOT NULL DEFAULT false,
  DROP COLUMN    "recaptchaEnabled";

ALTER TABLE "Booking"
  ALTER COLUMN "serviceCode" TYPE TEXT USING "serviceCode"::text;

ALTER TABLE "BookingService"
  ALTER COLUMN "engineTierId" DROP NOT NULL;

DROP TYPE "ServiceCode";
