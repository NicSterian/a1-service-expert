ALTER TABLE "User"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "mobileNumber" TEXT,
  ADD COLUMN "landlineNumber" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "addressLine3" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "county" TEXT,
  ADD COLUMN "postcode" TEXT,
  ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "registrationIp" TEXT,
  ADD COLUMN "profileUpdatedAt" TIMESTAMP,
  ADD COLUMN "lastLoginAt" TIMESTAMP;

CREATE TABLE "UserSession" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
