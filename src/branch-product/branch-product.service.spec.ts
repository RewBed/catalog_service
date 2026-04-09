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

jest.mock('generated/prisma/models', () => ({}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { BranchProductService } from './branch-product.service';

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

const createBranchProductRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 7001,
  productId: 101,
  branchId: 5,
  price: createDecimal(25990),
  stock: 20,
  isActive: true,
  createdAt: new Date('2026-03-10T08:45:17.000Z'),
  updatedAt: new Date('2026-03-10T10:01:44.000Z'),
  productItem: {
    id: 101,
    categoryId: 12,
    name: 'Oak Dining Table 120',
    sku: 'TBL-OAK-120',
    slug: 'oak-dining-table-120',
    description: 'Solid oak dining table, 120 cm width',
    shortDescription: 'Compact oak dining table for 4 people',
    technicalDescription:
      'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
    category: {
      name: 'Dining Tables',
    },
    images: [
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
        type: 'main',
        title: 'Main view',
        description: 'Front angle photo for product card',
      },
    ],
    variantGroups: [
      {
        id: 20,
        productId: 101,
        name: 'Size',
        isRequired: true,
        sortOrder: 1,
        isActive: true,
        createdAt: new Date('2026-03-10T08:00:00.000Z'),
        updatedAt: new Date('2026-03-10T08:00:00.000Z'),
        options: [
          {
            id: 30,
            groupId: 20,
            name: '120 cm',
            priceDelta: createDecimal(0),
            sortOrder: 1,
            isActive: true,
            createdAt: new Date('2026-03-10T08:00:00.000Z'),
            updatedAt: new Date('2026-03-10T08:00:00.000Z'),
          },
        ],
      },
    ],
  },
  ...overrides,
});

const createPrismaMock = () => ({
  branchProduct: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  branch: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
});

describe('BranchProductService', () => {
  it('returns public branch products with filters and pagination', async () => {
    const prisma = createPrismaMock();
    prisma.branchProduct.count.mockResolvedValue(1);
    prisma.branchProduct.findMany.mockResolvedValue([
      createBranchProductRecord(),
    ]);
    const service = new BranchProductService(prisma as any);

    const result = await service.getAll({
      branchId: 5,
      minPrice: 10000,
      maxPrice: 30000,
      name: 'oak',
      categoryId: 12,
      page: 2,
      limit: 10,
    });

    expect(prisma.branchProduct.count).toHaveBeenCalledWith({
      where: {
        isActive: true,
        branch: { isActive: true },
        branchId: 5,
        price: { gte: 10000, lte: 30000 },
        productItem: {
          deletedAt: null,
          name: { contains: 'oak', mode: 'insensitive' },
          categoryId: 12,
        },
      },
    });
    expect(result.meta).toEqual({
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 7001,
        categoryName: 'Dining Tables',
        slug: 'oak-dining-table-120',
      }),
    );
  });

  it('returns null for missing branch product by slug', async () => {
    const prisma = createPrismaMock();
    prisma.branchProduct.findFirst.mockResolvedValue(null);
    const service = new BranchProductService(prisma as any);

    const result = await service.getItemBySlug('missing', 5);

    expect(result).toBeNull();
  });

  it('creates branch product when branch and product exist', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValue({
      id: 5,
      isActive: true,
    });
    prisma.product.findUnique.mockResolvedValue({
      id: 101,
      deletedAt: null,
    });
    prisma.branchProduct.create.mockResolvedValue(createBranchProductRecord());
    const service = new BranchProductService(prisma as any);

    const result = await service.create({
      productId: 101,
      branchId: 5,
      price: 25990,
      stock: 20,
    });

    expect(prisma.branchProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          productId: 101,
          branchId: 5,
          price: 25990,
          stock: 20,
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 7001,
        productId: 101,
        branchId: 5,
      }),
    );
  });

  it('throws conflict when unique relation already exists', async () => {
    const prisma = createPrismaMock();
    prisma.branch.findUnique.mockResolvedValue({
      id: 5,
      isActive: true,
    });
    prisma.product.findUnique.mockResolvedValue({
      id: 101,
      deletedAt: null,
    });
    prisma.branchProduct.create.mockRejectedValue(createPrismaError('P2002'));
    const service = new BranchProductService(prisma as any);

    await expect(
      service.create({
        productId: 101,
        branchId: 5,
        price: 25990,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes active branch product', async () => {
    const prisma = createPrismaMock();
    prisma.branchProduct.findUnique.mockResolvedValue({
      id: 7001,
      isActive: true,
    });
    prisma.branchProduct.update.mockResolvedValue(
      createBranchProductRecord({ isActive: false }),
    );
    const service = new BranchProductService(prisma as any);

    await service.remove(7001);

    expect(prisma.branchProduct.update).toHaveBeenCalledWith({
      where: { id: 7001 },
      data: { isActive: false },
    });
  });

  it('restores branch product with admin projection', async () => {
    const prisma = createPrismaMock();
    prisma.branchProduct.findUnique
      .mockResolvedValueOnce({ id: 7001 })
      .mockResolvedValueOnce(null);
    prisma.branchProduct.update.mockResolvedValue(
      createBranchProductRecord({
        isActive: true,
        productItem: {
          category: {
            name: 'Dining Tables',
          },
          variantGroups: [],
          sku: 'TBL-OAK-120',
          description: 'Solid oak dining table, 120 cm width',
          shortDescription: 'Compact oak dining table for 4 people',
          technicalDescription:
            'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
        },
      }),
    );
    const service = new BranchProductService(prisma as any);

    const result = await service.restore(7001);

    expect(result).toEqual(
      expect.objectContaining({
        id: 7001,
        productId: 101,
        isActive: true,
      }),
    );
  });

  it('throws not found for missing active branch product on remove', async () => {
    const prisma = createPrismaMock();
    prisma.branchProduct.findUnique.mockResolvedValue(null);
    const service = new BranchProductService(prisma as any);

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('includes short and technical descriptions with image metadata in dto mapping', () => {
    const service = new BranchProductService({} as any);

    const dto = (service as any).toDto(createBranchProductRecord());

    expect(dto).toMatchObject({
      id: 7001,
      productId: 101,
      categoryId: 12,
      categoryName: 'Dining Tables',
      branchId: 5,
      price: 25990,
      stock: 20,
      name: 'Oak Dining Table 120',
      sku: 'TBL-OAK-120',
      article: 'TBL-OAK-120',
      description: 'Solid oak dining table, 120 cm width',
      shortDescription: 'Compact oak dining table for 4 people',
      technicalDescription:
        'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
      slug: 'oak-dining-table-120',
      images: [
        {
          url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
          type: 'main',
          title: 'Main view',
          description: 'Front angle photo for product card',
        },
      ],
      variantGroups: [
        {
          id: 20,
          name: 'Size',
          isRequired: true,
          sortOrder: 1,
          options: [
            {
              id: 30,
              name: '120 cm',
              priceDelta: 0,
              sortOrder: 1,
            },
          ],
        },
      ],
    });
  });
});
