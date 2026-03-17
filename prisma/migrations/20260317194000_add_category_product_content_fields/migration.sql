-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "shortDescription" TEXT,
ADD COLUMN "icon" TEXT;

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "shortDescription" TEXT,
ADD COLUMN "technicalDescription" TEXT;
