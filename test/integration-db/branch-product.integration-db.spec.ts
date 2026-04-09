import { ConflictException } from '@nestjs/common';
import { BranchProductService } from 'src/branch-product/branch-product.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: BranchProductService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new BranchProductService(ctx.prisma as any);

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

  async function seedProduct(categoryId: number, name: string, slug: string, sku: string) {
    return ctx.prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price: 1000,
        categoryId,
      },
    });
  }

  async function seedBranch(name: string) {
    return ctx.prisma.branch.create({
      data: {
        name,
        address: `${name} street`,
      },
    });
  }

  it('enforces unique (productId, branchId) relation', async () => {
    const category = await seedCategory();
    const product = await seedProduct(category.id, 'Oak Table 120', 'oak-120', 'SKU-120');
    const branch = await seedBranch('Central');

    await service.create({
      productId: product.id,
      branchId: branch.id,
      price: 1200,
      stock: 10,
    });

    await expect(
      service.create({
        productId: product.id,
        branchId: branch.id,
        price: 1300,
        stock: 11,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('applies public filters and pagination on branch-products', async () => {
    const category = await seedCategory();
    const branch = await seedBranch('Central');
    const productA = await seedProduct(category.id, 'Oak Table 120', 'oak-120', 'SKU-120');
    const productB = await seedProduct(category.id, 'Oak Table 140', 'oak-140', 'SKU-140');
    const productC = await seedProduct(category.id, 'Pine Bench', 'pine-bench', 'SKU-BENCH');

    await service.create({
      productId: productA.id,
      branchId: branch.id,
      price: 1000,
      stock: 5,
    });
    await service.create({
      productId: productB.id,
      branchId: branch.id,
      price: 1500,
      stock: 6,
    });
    await service.create({
      productId: productC.id,
      branchId: branch.id,
      price: 700,
      stock: 2,
    });

    const page1 = await service.getAll({
      branchId: branch.id,
      name: 'oak',
      minPrice: 900,
      maxPrice: 2000,
      page: 1,
      limit: 1,
    });
    const page2 = await service.getAll({
      branchId: branch.id,
      name: 'oak',
      minPrice: 900,
      maxPrice: 2000,
      page: 2,
      limit: 1,
    });

    expect(page1.meta.total).toBe(2);
    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0]!.name).toContain('Oak');
    expect(page2.items[0]!.name).toContain('Oak');
    expect(page1.items[0]!.id).not.toBe(page2.items[0]!.id);
  });

  it('supports admin filtering by stock/price and isActive', async () => {
    const category = await seedCategory();
    const branch = await seedBranch('Central');
    const product = await seedProduct(category.id, 'Oak Table 120', 'oak-120', 'SKU-120');
    const created = await service.create({
      productId: product.id,
      branchId: branch.id,
      price: 1000,
      stock: 5,
    });

    await service.update(created.id, {
      isActive: false,
      stock: 1,
      price: 900,
    });

    const list = await service.getAllAdmin({
      productId: product.id,
      branchId: branch.id,
      isActive: false,
      minStock: 1,
      maxStock: 2,
      minPrice: 800,
      maxPrice: 950,
      page: 1,
      limit: 10,
    });

    expect(list.meta.total).toBe(1);
    expect(list.items[0]).toEqual(
      expect.objectContaining({
        id: created.id,
        isActive: false,
        stock: 1,
        price: 900,
      }),
    );
  });
});
