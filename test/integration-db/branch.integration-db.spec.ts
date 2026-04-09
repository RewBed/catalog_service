import { BranchService } from 'src/branch/branch.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: BranchService', () => {
  const ctx = createIntegrationPrismaContext();
  const service = new BranchService(ctx.prisma as any);

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

  it('creates branch with extended fields and returns in public list', async () => {
    const created = await service.create({
      name: 'Central',
      address: 'Main st 1',
      city: 'Moscow',
      email: 'central@example.com',
      isActive: true,
    });

    const list = await service.getAll({
      page: 1,
      limit: 10,
    });

    expect(created.name).toBe('Central');
    expect(created.city).toBe('Moscow');
    expect(list.meta.total).toBe(1);
    expect(list.items[0]!.name).toBe('Central');
  });

  it('soft deletes and restores branch via isActive flag', async () => {
    const created = await service.create({
      name: 'Central',
      address: 'Main st 1',
    });

    await service.remove(created.id);

    const publicItemAfterDelete = await service.getItem(created.id);
    const adminDeletedList = await service.getAllAdmin({
      isActive: false,
      page: 1,
      limit: 10,
    });

    expect(publicItemAfterDelete).toBeNull();
    expect(adminDeletedList.meta.total).toBe(1);

    await service.restore(created.id);

    const publicItemAfterRestore = await service.getItem(created.id);
    expect(publicItemAfterRestore).not.toBeNull();
    expect(publicItemAfterRestore!.name).toBe('Central');
  });

  it('applies admin filtering and pagination', async () => {
    await service.create({
      name: 'Central',
      address: 'Main st 1',
    });
    await service.create({
      name: 'North',
      address: 'North st 2',
      isActive: false,
    });
    await service.create({
      name: 'South',
      address: 'South st 3',
    });

    const activePage = await service.getAllAdmin({
      isActive: true,
      page: 1,
      limit: 1,
    });
    const inactivePage = await service.getAllAdmin({
      isActive: false,
      page: 1,
      limit: 10,
    });

    expect(activePage.meta.total).toBe(2);
    expect(activePage.items).toHaveLength(1);
    expect(inactivePage.meta.total).toBe(1);
    expect(inactivePage.items[0]!.name).toBe('North');
  });
});
