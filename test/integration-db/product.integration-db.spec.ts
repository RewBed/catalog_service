import { ConflictException } from '@nestjs/common';
import { ProductService } from 'src/product/product.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: ProductService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new ProductService(ctx.prisma as any);

  beforeAll(async () => {
    await ctx.prisma.$connect();
  });

  beforeEach(async () => {
    await truncateAllPublicTables(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.prisma.$disconnect();
    await ctx.pool.end();
  });

  async function seedCategory() {
    return ctx.prisma.category.create({
      data: {
        name: 'Tables',
        slug: 'tables',
      },
    });
  }

  async function seedBranch() {
    return ctx.prisma.branch.create({
      data: {
        name: 'Central Branch',
        address: 'Tverskaya 1',
      },
    });
  }

  it('enforces unique slug and sku through service-level conflict mapping', async () => {
    const category = await seedCategory();

    await service.createProduct({
      name: 'Oak Table 120',
      slug: 'oak-table-120',
      sku: 'SKU-120',
      price: 1000,
      categoryId: category.id,
    });

    await expect(
      service.createProduct({
        name: 'Oak Table 120 v2',
        slug: 'oak-table-120',
        sku: 'SKU-121',
        price: 1100,
        categoryId: category.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.createProduct({
        name: 'Oak Table 140',
        slug: 'oak-table-140',
        sku: 'SKU-120',
        price: 1200,
        categoryId: category.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes product and deactivates linked branch-products, then restores product', async () => {
    const category = await seedCategory();
    const branch = await seedBranch();
    const product = await service.createProduct({
      name: 'Oak Table 120',
      slug: 'oak-table-120',
      sku: 'SKU-120',
      price: 1000,
      categoryId: category.id,
    });

    await ctx.prisma.branchProduct.create({
      data: {
        productId: product.id,
        branchId: branch.id,
        price: 1000,
        stock: 5,
      },
    });

    await service.removeProduct(product.id);

    const deletedProduct = await ctx.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: {
        deletedAt: true,
      },
    });
    const linkedBranchProduct = await ctx.prisma.branchProduct.findFirstOrThrow({
      where: {
        productId: product.id,
        branchId: branch.id,
      },
      select: {
        isActive: true,
      },
    });

    expect(deletedProduct.deletedAt).not.toBeNull();
    expect(linkedBranchProduct.isActive).toBe(false);

    await service.restoreProduct(product.id);

    const restoredProduct = await ctx.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { deletedAt: true },
    });
    expect(restoredProduct.deletedAt).toBeNull();
  });

  it('applies filtering and pagination for admin product list', async () => {
    const category = await seedCategory();
    await service.createProduct({
      name: 'Oak Table 120',
      slug: 'oak-table-120',
      sku: 'SKU-120',
      price: 1000,
      categoryId: category.id,
    });
    await service.createProduct({
      name: 'Oak Table 140',
      slug: 'oak-table-140',
      sku: 'SKU-140',
      price: 1500,
      categoryId: category.id,
    });
    await service.createProduct({
      name: 'Pine Bench',
      slug: 'pine-bench',
      sku: 'SKU-BENCH',
      price: 700,
      categoryId: category.id,
    });

    const page1 = await service.getFilteredProducts({
      name: 'oak',
      minPrice: 900,
      maxPrice: 2000,
      categoryId: category.id,
      isDeleted: false,
      page: 1,
      limit: 1,
    });

    const page2 = await service.getFilteredProducts({
      name: 'oak',
      minPrice: 900,
      maxPrice: 2000,
      categoryId: category.id,
      isDeleted: false,
      page: 2,
      limit: 1,
    });

    expect(page1.meta.total).toBe(2);
    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0]!.name).not.toBe(page2.items[0]!.name);
  });
});
