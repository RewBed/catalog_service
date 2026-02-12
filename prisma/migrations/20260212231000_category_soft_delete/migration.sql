ALTER TABLE "Category"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");
