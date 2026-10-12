-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "planner" TEXT NOT NULL DEFAULT 'pending',
    "summary" TEXT NOT NULL DEFAULT '',
    "policyJson" TEXT NOT NULL,
    "traceJson" TEXT NOT NULL DEFAULT '[]',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "screenshotsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AgentRun_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Milestone" (
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
    "browserPolicyJson" TEXT,
    "autoCapture" BOOLEAN NOT NULL DEFAULT false,
    "autoCaptureUntil" DATETIME,
    "autoCaptureLimit" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Milestone_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Milestone" ("acceptanceCriteria", "agreementId", "aiRiskNotes", "amount", "authorizationId", "authorizedAt", "captureId", "description", "dueDate", "expiresAt", "id", "orderId", "paymentStatus", "position", "status", "title") SELECT "acceptanceCriteria", "agreementId", "aiRiskNotes", "amount", "authorizationId", "authorizedAt", "captureId", "description", "dueDate", "expiresAt", "id", "orderId", "paymentStatus", "position", "status", "title" FROM "Milestone";
DROP TABLE "Milestone";
ALTER TABLE "new_Milestone" RENAME TO "Milestone";
CREATE UNIQUE INDEX "Milestone_orderId_key" ON "Milestone"("orderId");
CREATE UNIQUE INDEX "Milestone_authorizationId_key" ON "Milestone"("authorizationId");
CREATE UNIQUE INDEX "Milestone_captureId_key" ON "Milestone"("captureId");
CREATE INDEX "Milestone_agreementId_idx" ON "Milestone"("agreementId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AgentRun_milestoneId_idx" ON "AgentRun"("milestoneId");
