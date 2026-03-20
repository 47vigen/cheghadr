-- AlterTable
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_portfolioId_snapshotAt_idx" ON "PortfolioSnapshot"("userId", "portfolioId", "snapshotAt" DESC);
