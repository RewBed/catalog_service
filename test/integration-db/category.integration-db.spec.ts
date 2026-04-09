import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryService } from 'src/category/category.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: CategoryService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new CategoryService(ctx.prisma as any);

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

  async function seedCategory(name = 'Tables', slug = 'tables', parentId?: number) {
    return ctx.prisma.category.create({
      data: {
        name,
        slug,
        ...(parentId !== undefined ? { parentId } : {}),
      },
    });
  }

  it('enforces unique slug via service-level conflict mapping', async () => {
    await service.create({
      name: 'Tables',
      slug: 'tables',
    });

    await expect(
      service.create({
        name: 'Tables v2',
        slug: 'tables',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes category and detaches child categories from parent', async () => {
    const parent = await seedCategory('Parent', 'parent');
    const child = await seedCategory('Child', 'child', parent.id);

    await service.remove(parent.id);

    const deletedParent = await ctx.prisma.category.findUniqueOrThrow({
      where: { id: parent.id },
      select: { deletedAt: true },
    });
    const updatedChild = await ctx.prisma.category.findUniqueOrThrow({
      where: { id: child.id },
      select: { parentId: true },
    });

    expect(deletedParent.deletedAt).not.toBeNull();
    expect(updatedChild.parentId).toBeNull();
  });

  it('restores soft-deleted category', async () => {
    const category = await seedCategory();

    await service.remove(category.id);
    await service.restore(category.id);

    const restored = await ctx.prisma.category.findUniqueOrThrow({
      where: { id: category.id },
      select: { deletedAt: true },
    });
    expect(restored.deletedAt).toBeNull();
  });

  it('applies public/admin filtering and pagination', async () => {
    const parent = await seedCategory('Parent', 'parent');
    await service.create({
      name: 'Oak Tables',
      slug: 'oak-tables',
      description: 'oak',
      parentId: parent.id,
    });
    await service.create({
      name: 'Pine Tables',
      slug: 'pine-tables',
      description: 'pine',
      parentId: parent.id,
    });
    const deleted = await service.create({
      name: 'Hidden',
      slug: 'hidden',
    });
    await service.remove(deleted.id);

    const publicPage = await service.getAll({
      name: 'tables',
      parentId: parent.id,
      page: 1,
      limit: 10,
    });
    const adminDeletedPage = await service.getAllAdmin({
      isDeleted: true,
      page: 1,
      limit: 10,
    });

    expect(publicPage.meta.total).toBe(2);
    expect(publicPage.items.map((item) => item.slug).sort()).toEqual([
      'oak-tables',
      'pine-tables',
    ]);
    expect(adminDeletedPage.meta.total).toBe(1);
    expect(adminDeletedPage.items[0]!.slug).toBe('hidden');
  });

  it('throws not found when assigning missing parent on update', async () => {
    const category = await seedCategory();

    await expect(
      service.update(category.id, {
        parentId: 999999,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
