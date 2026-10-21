ALTER TABLE "Agreement" ADD COLUMN "paymentRouting" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Milestone" ADD COLUMN "payeeMerchantId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "payeeUserId" TEXT;
CREATE TABLE "PayPalConnection" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "trackingId" TEXT NOT NULL,
  "referralId" TEXT,
  "merchantId" TEXT,
  "partnerClientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "checkedAt" DATETIME,
  "consentedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PayPalConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PayPalConnection_trackingId_key" ON "PayPalConnection"("trackingId");
CREATE UNIQUE INDEX "PayPalConnection_merchantId_key" ON "PayPalConnection"("merchantId");
