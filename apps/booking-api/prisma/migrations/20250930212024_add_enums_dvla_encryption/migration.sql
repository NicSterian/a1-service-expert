-- CreateEnum
CREATE TYPE "ServiceCode" AS ENUM ('SERVICE_1', 'SERVICE_2', 'SERVICE_3');

-- CreateEnum
CREATE TYPE "EngineTierCode" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "engineTierCode" "EngineTierCode",
ADD COLUMN     "serviceCode" "ServiceCode",
ADD COLUMN     "servicePricePence" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "dvlaApiKeyEnc" TEXT,
ADD COLUMN     "dvlaApiKeyIv" TEXT,
ADD COLUMN     "dvlaApiKeyTag" TEXT;
