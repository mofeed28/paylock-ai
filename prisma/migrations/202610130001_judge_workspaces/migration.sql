ALTER TABLE "Agreement" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';
CREATE INDEX "Agreement_workspaceId_idx" ON "Agreement"("workspaceId");
CREATE TABLE "DemoUsage" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0);
