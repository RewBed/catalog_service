import { CollectionService } from 'src/collection/collection.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: CollectionService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new CollectionService(ctx.prisma as any);

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

  async function seedBranch(name = 'Central') {
    return ctx.prisma.branch.create({
      data: {
        name,
        address: `${name} street`,
      },
    });
  }

  it('creates collection with unique ordered collection-items', async () => {
    const category = await seedCategory();
    const p1 = await seedProduct(category.id, 'Oak 120', 'oak-120', 'SKU-120');
    const p2 = await seedProduct(category.id, 'Oak 140', 'oak-140', 'SKU-140');

    const created = await service.create({
      title: 'Featured',
      productIds: [p2.id, p1.id, p2.id],
    });

    const items = await ctx.prisma.productCollectionItem.findMany({
      where: { collectionId: created.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        productId: true,
        sortOrder: true,
      },
    });

    expect(created.productIds).toEqual([p2.id, p1.id]);
    expect(items).toEqual([
      { productId: p2.id, sortOrder: 0 },
      { productId: p1.id, sortOrder: 1 },
    ]);
  });

  it('replaces collection-items on update', async () => {
    const category = await seedCategory();
    const p1 = await seedProduct(category.id, 'Oak 120', 'oak-120', 'SKU-120');
    const p2 = await seedProduct(category.id, 'Oak 140', 'oak-140', 'SKU-140');
    const p3 = await seedProduct(category.id, 'Pine Bench', 'pine-bench', 'SKU-BENCH');

    const created = await service.create({
      title: 'Featured',
      productIds: [p1.id, p2.id],
    });

    await service.update(created.id, {
      title: 'Featured Updated',
      productIds: [p3.id],
    });

    const items = await ctx.prisma.productCollectionItem.findMany({
      where: { collectionId: created.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        productId: true,
        sortOrder: true,
      },
    });

    expect(items).toEqual([{ productId: p3.id, sortOrder: 0 }]);
  });

  it('returns public collection products for branch preserving collection order and active branch-products only', async () => {
    const category = await seedCategory();
    const p1 = await seedProduct(category.id, 'Oak 120', 'oak-120', 'SKU-120');
    const p2 = await seedProduct(category.id, 'Oak 140', 'oak-140', 'SKU-140');
    const p3 = await seedProduct(category.id, 'Pine Bench', 'pine-bench', 'SKU-BENCH');
    const branch = await seedBranch();

    const collection = await service.create({
      title: 'Featured',
      productIds: [p1.id, p2.id, p3.id],
    });

    await ctx.prisma.branchProduct.create({
      data: {
        productId: p1.id,
        branchId: branch.id,
        price: 1000,
        stock: 5,
        isActive: true,
      },
    });
    await ctx.prisma.branchProduct.create({
      data: {
        productId: p2.id,
        branchId: branch.id,
        price: 1200,
        stock: 3,
        isActive: false,
      },
    });
    await ctx.prisma.branchProduct.create({
      data: {
        productId: p3.id,
        branchId: branch.id,
        price: 700,
        stock: 10,
        isActive: true,
      },
    });

    const publicDto = await service.getPublicItem(collection.id, branch.id);

    expect(publicDto).not.toBeNull();
    expect(publicDto!.products.map((item) => item.productId)).toEqual([
      p1.id,
      p3.id,
    ]);
  });
});
