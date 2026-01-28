/*
  Warnings:

  - You are about to drop the column `branchId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_branchId_fkey";

-- DropIndex
DROP INDEX "User_branchId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "branchId";

-- CreateTable
CREATE TABLE "AgentBranchAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "AgentBranchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentBranchAssignment_userId_idx" ON "AgentBranchAssignment"("userId");

-- CreateIndex
CREATE INDEX "AgentBranchAssignment_branchId_idx" ON "AgentBranchAssignment"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentBranchAssignment_userId_branchId_key" ON "AgentBranchAssignment"("userId", "branchId");

-- AddForeignKey
ALTER TABLE "AgentBranchAssignment" ADD CONSTRAINT "AgentBranchAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBranchAssignment" ADD CONSTRAINT "AgentBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


