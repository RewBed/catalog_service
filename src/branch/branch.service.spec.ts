jest.mock('src/core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code?: string;
      meta?: Record<string, unknown>;
    },
  },
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { BranchService } from './branch.service';

type BranchRecord = {
  id: number;
  name: string;
  description?: string | null;
  address?: string;
  city?: string | null;
  region?: string | null;
  phone?: string | null;
  email?: string | null;
  workingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bannerImage?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const createPrismaError = (code: string) => {
  const KnownRequestError = Prisma
    .PrismaClientKnownRequestError as unknown as new () => {
    code?: string;
    meta?: Record<string, unknown>;
  };
  const error = new KnownRequestError();
  error.code = code;
  return error;
};

const createBranch = (overrides: Partial<BranchRecord> = {}): BranchRecord => ({
  id: 1,
  name: 'Moscow Center',
  description: null,
  address: 'Tverskaya 1',
  city: null,
  region: null,
  phone: null,
  email: null,
  workingHours: null,
  latitude: null,
  longitude: null,
  bannerImage: null,
  isActive: true,
  createdAt: new Date('2026-03-10T10:00:00.000Z'),
  updatedAt: new Date('2026-03-10T10:10:00.000Z'),
  ...overrides,
});

const createPrismaMock = () => ({
  branch: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('BranchService', () => {
  it('returns active branches with pagination for public list', async () => {
    const prisma = createPrismaMock();
    prisma.branch.count.mockResolvedValue(1);
    prisma.branch.findMany.mockResolvedValue([createBranch()]);
    const service = new BranchService(prisma as any);

    const result = await service.getAll({ page: 2, limit: 10 });

    expect(prisma.branch.count).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(prisma.branch.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      skip: 10,
      take: 10,
    });
    expect(result.meta).toEqual({
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Moscow Center',
        address: 'Tverskaya 1',
      }),
    ]);
  });

  it('returns null for inactive branch in public details', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValue(createBranch({ isActive: false }));
    const service = new BranchService(prisma as any);

    const result = await service.getItem(5);

    expect(result).toBeNull();
  });

  it('creates branch and maps admin dto', async () => {
    const prisma = createPrismaMock();
    prisma.branch.create.mockResolvedValue(
      createBranch({
        id: 8,
        city: 'Moscow',
        region: 'Moscow City',
        isActive: false,
      }),
    );
    const service = new BranchService(prisma as any);

    const result = await service.create({
      name: 'Downtown',
      address: 'Arbat 3',
      city: 'Moscow',
      region: 'Moscow City',
      isActive: false,
    });

    expect(prisma.branch.create).toHaveBeenCalledWith({
      data: {
        name: 'Downtown',
        address: 'Arbat 3',
        city: 'Moscow',
        region: 'Moscow City',
        isActive: false,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 8,
        city: 'Moscow',
        region: 'Moscow City',
        isActive: false,
      }),
    );
  });

  it('throws conflict on foreign key prisma error', async () => {
    const prisma = createPrismaMock();
    prisma.branch.create.mockRejectedValue(createPrismaError('P2003'));
    const service = new BranchService(prisma as any);

    await expect(
      service.create({
        name: 'Downtown',
        address: 'Arbat 3',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes active branch', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValue(
      createBranch({ id: 4, isActive: true }),
    );
    prisma.branch.update.mockResolvedValue(
      createBranch({ id: 4, isActive: false }),
    );
    const service = new BranchService(prisma as any);

    await service.remove(4);

    expect(prisma.branch.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { isActive: false },
    });
  });

  it('restores inactive branch', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValueOnce(
      createBranch({ id: 9, isActive: false }),
    );
    prisma.branch.update.mockResolvedValue(
      createBranch({ id: 9, isActive: true }),
    );
    const service = new BranchService(prisma as any);

    const result = await service.restore(9);

    expect(prisma.branch.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { isActive: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        isActive: true,
      }),
    );
  });

  it('throws not found when trying to restore missing branch', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValue(null);
    const service = new BranchService(prisma as any);

    await expect(service.restore(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
