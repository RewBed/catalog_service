import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductVariantService } from 'src/product/product-variant.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: ProductVariantService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new ProductVariantService(ctx.prisma as any);

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

  async function seedProduct() {
    const category = await ctx.prisma.category.create({
      data: {
        name: 'Tables',
        slug: 'tables',
      },
    });

    return ctx.prisma.product.create({
      data: {
        name: 'Oak Table 120',
        slug: 'oak-table-120',
        sku: 'SKU-120',
        price: 1000,
        categoryId: category.id,
      },
    });
  }

  it('creates variant groups/options and returns public active projection', async () => {
    const product = await seedProduct();

    const group = await service.createGroup(product.id, {
      name: 'Size',
      isRequired: true,
      sortOrder: 1,
      isActive: true,
    });
    await service.createOption(product.id, group.id, {
      name: '120 cm',
      priceDelta: 0,
      sortOrder: 1,
      isActive: true,
    });
    await service.createOption(product.id, group.id, {
      name: '140 cm',
      priceDelta: 300,
      sortOrder: 2,
      isActive: true,
    });

    const groups = await service.getAllPublic(product.id);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe('Size');
    expect(groups[0]!.options.map((item) => item.name)).toEqual([
      '120 cm',
      '140 cm',
    ]);
  });

  it('calculates variant final price and enforces required option selection', async () => {
    const product = await seedProduct();
    const requiredGroup = await service.createGroup(product.id, {
      name: 'Size',
      isRequired: true,
    });
    const optionalGroup = await service.createGroup(product.id, {
      name: 'Addon',
      isRequired: false,
    });
    const sizeOption = await service.createOption(product.id, requiredGroup.id, {
      name: '140 cm',
      priceDelta: 250,
    });
    const addonOption = await service.createOption(product.id, optionalGroup.id, {
      name: 'Drawer',
      priceDelta: 100,
    });

    await expect(service.getPricePublic(product.id, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const priced = await service.getPricePublic(product.id, [
      sizeOption.id,
      addonOption.id,
      addonOption.id,
    ]);

    expect(priced.basePrice).toBe(1000);
    expect(priced.optionsPrice).toBe(350);
    expect(priced.finalPrice).toBe(1350);
    expect(priced.selectedOptions).toHaveLength(2);
  });

  it('soft deletes and restores group with options', async () => {
    const product = await seedProduct();
    const group = await service.createGroup(product.id, {
      name: 'Size',
    });
    await service.createOption(product.id, group.id, {
      name: '120 cm',
      priceDelta: 0,
      isActive: true,
    });

    await service.removeGroup(product.id, group.id);

    const groupAfterDelete = await ctx.prisma.productVariantGroup.findUniqueOrThrow({
      where: { id: group.id },
      select: { isActive: true },
    });
    const optionsAfterDelete = await ctx.prisma.productVariantOption.findMany({
      where: { groupId: group.id },
      select: { isActive: true },
    });

    expect(groupAfterDelete.isActive).toBe(false);
    expect(optionsAfterDelete.every((item) => item.isActive === false)).toBe(true);

    await service.restoreGroup(product.id, group.id);

    const groupAfterRestore = await ctx.prisma.productVariantGroup.findUniqueOrThrow({
      where: { id: group.id },
      select: { isActive: true },
    });
    expect(groupAfterRestore.isActive).toBe(true);
  });

  it('maps unique group name conflict to ConflictException', async () => {
    const product = await seedProduct();

    await service.createGroup(product.id, { name: 'Size' });

    await expect(
      service.createGroup(product.id, { name: 'Size' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
