-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollectionItem" (
    "id" SERIAL NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCollection_deletedAt_idx" ON "ProductCollection"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_collectionId_idx" ON "ProductCollectionItem"("collectionId");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_productId_idx" ON "ProductCollectionItem"("productId");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_sortOrder_idx" ON "ProductCollectionItem"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollectionItem_collectionId_productId_key" ON "ProductCollectionItem"("collectionId", "productId");

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
