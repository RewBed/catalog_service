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

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { CollectionService } from './collection.service';

const createDecimal = (value: number) => ({
  toNumber: () => value,
});

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

const createPrismaMock = () => {
  const prisma: any = {
    $transaction: jest.fn(),
    productCollection: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productCollectionItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    branch: {
      findUnique: jest.fn(),
    },
    branchProduct: {
      findMany: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(async (input: unknown) => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    if (typeof input === 'function') {
      return input(prisma);
    }

    return input;
  });

  return prisma;
};

describe('CollectionService', () => {
  it('returns public collection with products ordered by collection item sort order', async () => {
    const prisma = createPrismaMock();
    prisma.productCollection.findFirst.mockResolvedValue({
      id: 1,
      title: 'Main Banner',
      description: 'Homepage collection',
      items: [
        { productId: 20, sortOrder: 0 },
        { productId: 10, sortOrder: 1 },
      ],
    });
    prisma.branch.findUnique.mockResolvedValue({
      id: 5,
      isActive: true,
    });
    prisma.branchProduct.findMany.mockResolvedValue([
      {
        id: 7002,
        productId: 10,
        branchId: 5,
        price: createDecimal(150),
        stock: 7,
        productItem: {
          id: 10,
          categoryId: 2,
          category: { name: 'Category B' },
          name: 'Product B',
          slug: 'product-b',
          sku: 'SKU-B',
          description: 'B',
          shortDescription: 'Short B',
          technicalDescription: 'Tech B',
          images: [],
        },
      },
      {
        id: 7001,
        productId: 20,
        branchId: 5,
        price: createDecimal(100),
        stock: 10,
        productItem: {
          id: 20,
          categoryId: 1,
          category: { name: 'Category A' },
          name: 'Product A',
          slug: 'product-a',
          sku: 'SKU-A',
          description: 'A',
          shortDescription: 'Short A',
          technicalDescription: 'Tech A',
          images: [],
        },
      },
    ]);
    const service = new CollectionService(prisma as any);

    const result = await service.getPublicItem(1, 5);

    expect(result).toEqual({
      id: 1,
      title: 'Main Banner',
      description: 'Homepage collection',
      products: [
        expect.objectContaining({
          id: 7001,
          productId: 20,
          name: 'Product A',
        }),
        expect.objectContaining({
          id: 7002,
          productId: 10,
          name: 'Product B',
        }),
      ],
    });
  });

  it('creates collection and deduplicates product ids preserving order', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    prisma.productCollection.create.mockResolvedValue({
      id: 7,
      title: 'Top picks',
      description: 'Hand selected',
      createdAt: new Date('2026-03-12T16:10:00.000Z'),
      updatedAt: new Date('2026-03-12T16:15:00.000Z'),
      deletedAt: null,
      items: [
        {
          id: 1,
          productId: 2,
          product: {
            id: 2,
            name: 'Product 2',
            slug: 'product-2',
            sku: 'SKU-2',
          },
        },
        {
          id: 2,
          productId: 1,
          product: {
            id: 1,
            name: 'Product 1',
            slug: 'product-1',
            sku: 'SKU-1',
          },
        },
      ],
    });
    const service = new CollectionService(prisma as any);

    const result = await service.create({
      title: 'Top picks',
      description: 'Hand selected',
      productIds: [2, 2, 1],
    });

    expect(prisma.productCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          title: 'Top picks',
          description: 'Hand selected',
          items: {
            create: [
              { productId: 2, sortOrder: 0 },
              { productId: 1, sortOrder: 1 },
            ],
          },
        },
      }),
    );
    expect(result.productIds).toEqual([2, 1]);
  });

  it('updates collection fields and replaces product links', async () => {
    const prisma = createPrismaMock();
    prisma.productCollection.findUnique
      .mockResolvedValueOnce({
        id: 7,
        deletedAt: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        title: 'Top picks',
        description: 'Updated',
        createdAt: new Date('2026-03-12T16:10:00.000Z'),
        updatedAt: new Date('2026-03-12T16:16:00.000Z'),
        deletedAt: null,
        items: [
          {
            id: 11,
            productId: 3,
            product: {
              id: 3,
              name: 'Product 3',
              slug: 'product-3',
              sku: 'SKU-3',
            },
          },
        ],
      });
    prisma.product.findMany.mockResolvedValue([{ id: 3 }]);
    prisma.productCollection.update.mockResolvedValue({
      id: 7,
    });
    prisma.productCollectionItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.productCollectionItem.createMany.mockResolvedValue({ count: 1 });
    const service = new CollectionService(prisma as any);

    const result = await service.update(7, {
      description: 'Updated',
      productIds: [3],
    });

    expect(prisma.productCollection.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { description: 'Updated' },
    });
    expect(prisma.productCollectionItem.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 7 },
    });
    expect(prisma.productCollectionItem.createMany).toHaveBeenCalledWith({
      data: [{ collectionId: 7, productId: 3, sortOrder: 0 }],
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        description: 'Updated',
      }),
    );
  });

  it('soft deletes collection', async () => {
    const prisma = createPrismaMock();
    prisma.productCollection.findUnique.mockResolvedValue({
      id: 7,
      deletedAt: null,
    });
    prisma.productCollection.update.mockResolvedValue({
      id: 7,
    });
    const service = new CollectionService(prisma as any);

    await service.remove(7);

    expect(prisma.productCollection.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('throws not found when some linked products do not exist', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    const service = new CollectionService(prisma as any);

    await expect(
      service.create({
        title: 'Top picks',
        productIds: [1, 2],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps prisma duplicate relation error to conflict exception', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.productCollection.create.mockRejectedValue(createPrismaError('P2002'));
    const service = new CollectionService(prisma as any);

    await expect(
      service.create({
        title: 'Top picks',
        productIds: [1],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
