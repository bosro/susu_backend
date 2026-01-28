-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "viewedBy" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Collection_viewedBy_idx" ON "Collection"("viewedBy");

UPDATE "Collection" SET "viewedBy" = ARRAY["agentId"]::TEXT[];