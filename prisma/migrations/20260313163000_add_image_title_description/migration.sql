-- AlterTable
ALTER TABLE "ProductImage"
ADD COLUMN "title" VARCHAR(255),
ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "CategoryImage"
ADD COLUMN "title" VARCHAR(255),
ADD COLUMN "description" TEXT;
