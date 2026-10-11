-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL DEFAULT 'Alex Morgan',
    "buyerEmail" TEXT NOT NULL DEFAULT 'buyer@example.com',
    "sellerEmail" TEXT NOT NULL,
    "sellerToken" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paymentMode" TEXT NOT NULL,
    "aiSource" TEXT NOT NULL,
    "riskFlags" TEXT NOT NULL,
    "deadline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agreementId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNFUNDED',
    "dueDate" TEXT,
    "aiRiskNotes" TEXT NOT NULL,
    "orderId" TEXT,
    "authorizationId" TEXT,
    "captureId" TEXT,
    "authorizedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "Milestone_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT,
    "aiScore" INTEGER NOT NULL,
    "aiRecommendation" TEXT NOT NULL,
    "aiSource" TEXT NOT NULL,
    "aiReviewJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agreementId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerAuthorizationId" TEXT,
    "providerCaptureId" TEXT,
    "operationKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentEvent_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agreementId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_sellerToken_key" ON "Agreement"("sellerToken");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_orderId_key" ON "Milestone"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_authorizationId_key" ON "Milestone"("authorizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_captureId_key" ON "Milestone"("captureId");

-- CreateIndex
CREATE INDEX "Milestone_agreementId_idx" ON "Milestone"("agreementId");

-- CreateIndex
CREATE INDEX "Submission_milestoneId_idx" ON "Submission"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_operationKey_key" ON "PaymentEvent"("operationKey");

-- CreateIndex
CREATE INDEX "PaymentEvent_agreementId_idx" ON "PaymentEvent"("agreementId");

-- CreateIndex
CREATE INDEX "TimelineEvent_agreementId_idx" ON "TimelineEvent"("agreementId");
