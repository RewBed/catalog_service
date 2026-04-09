jest.mock('src/core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code?: string;
      meta?: { target?: string[] };
    },
  },
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ProductService } from './product.service';

const createDecimal = (value: number) => ({
  toNumber: () => value,
});

const createPrismaError = (code: string, target?: string[]) => {
  const KnownRequestError = Prisma
    .PrismaClientKnownRequestError as unknown as new () => {
    code?: string;
    meta?: { target?: string[] };
  };
  const error = new KnownRequestError();
  error.code = code;
  error.meta = target ? { target } : undefined;
  return error;
};

const createProductRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  name: 'Oak Dining Table 120',
  fullName: 'Solid Oak Dining Table 120 x 80 cm',
  sku: 'TBL-OAK-120',
  slug: 'oak-dining-table-120',
  shortDescription: 'Compact oak dining table for 4 people',
  description: 'Natural solid oak dining table with matte finish',
  technicalDescription:
    'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
  price: createDecimal(24990),
  categoryId: 3,
  sortOrder: 10,
  deletedAt: null,
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
  ...overrides,
});

const createPrismaMock = () => {
  const prisma: any = {
    $transaction: jest.fn(),
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    branchProduct: {
      updateMany: jest.fn(),
    },
    productVariantGroup: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productVariantOption: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

describe('ProductService', () => {
  it('returns filtered admin products with pagination', async () => {
    const prisma = createPrismaMock();
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([createProductRecord()]);
    const service = new ProductService(prisma as any);

    const result = await service.getFilteredProducts({
      name: 'oak',
      minPrice: 20000,
      maxPrice: 30000,
      categoryId: 3,
      isDeleted: false,
      page: 2,
      limit: 10,
    });

    expect(prisma.product.count).toHaveBeenCalledWith({
      where: {
        name: { contains: 'oak', mode: 'insensitive' },
        price: { gte: 20000, lte: 30000 },
        categoryId: 3,
        deletedAt: null,
      },
    });
    expect(result.meta).toEqual({
      total: 1,
      limit: 10,
      page: 2,
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 101,
        sku: 'TBL-OAK-120',
        article: 'TBL-OAK-120',
      }),
    );
  });

  it('creates product with nested variant groups and options', async () => {
    const prisma = createPrismaMock();
    prisma.category.findUnique.mockResolvedValue({
      id: 3,
      deletedAt: null,
    });
    prisma.product.create.mockResolvedValue(createProductRecord());
    const service = new ProductService(prisma as any);

    const result = await service.createProduct({
      name: 'Oak Dining Table 120',
      slug: 'oak-dining-table-120',
      price: 24990,
      categoryId: 3,
      variantGroups: [
        {
          name: 'Size',
          isRequired: true,
          sortOrder: 1,
          options: [
            { name: '120 cm', priceDelta: 0, sortOrder: 1 },
            { name: '140 cm', priceDelta: 300, sortOrder: 2 },
          ],
        },
      ],
    });

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Oak Dining Table 120',
          slug: 'oak-dining-table-120',
          categoryId: 3,
          variantGroups: {
            create: [
              {
                name: 'Size',
                isRequired: true,
                sortOrder: 1,
                options: {
                  create: [
                    { name: '120 cm', priceDelta: 0, sortOrder: 1 },
                    { name: '140 cm', priceDelta: 300, sortOrder: 2 },
                  ],
                },
              },
            ],
          },
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 101,
        name: 'Oak Dining Table 120',
      }),
    );
  });

  it('maps duplicate sku to conflict error', async () => {
    const prisma = createPrismaMock();
    prisma.category.findUnique.mockResolvedValue({
      id: 3,
      deletedAt: null,
    });
    prisma.product.create.mockRejectedValue(
      createPrismaError('P2002', ['sku']),
    );
    const service = new ProductService(prisma as any);

    await expect(
      service.createProduct({
        name: 'Oak Dining Table 120',
        slug: 'oak-dining-table-120',
        sku: 'TBL-OAK-120',
        price: 24990,
        categoryId: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects update when new variant group has no name', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue({
      id: 101,
      deletedAt: null,
    });
    prisma.product.update.mockResolvedValue({
      id: 101,
    });
    const service = new ProductService(prisma as any);

    await expect(
      service.updateProduct(101, {
        variantGroups: [
          {
            sortOrder: 1,
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates existing variant group option and creates a new option', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique
      .mockResolvedValueOnce({
        id: 101,
        deletedAt: null,
      })
      .mockResolvedValueOnce(createProductRecord());
    prisma.product.update.mockResolvedValue({
      id: 101,
    });
    prisma.productVariantGroup.findFirst.mockResolvedValue({
      id: 12,
    });
    prisma.productVariantOption.findFirst.mockResolvedValue({
      id: 300,
    });
    prisma.productVariantGroup.update.mockResolvedValue({
      id: 12,
    });
    prisma.productVariantOption.update.mockResolvedValue({
      id: 300,
    });
    prisma.productVariantOption.create.mockResolvedValue({
      id: 301,
    });
    const service = new ProductService(prisma as any);

    const result = await service.updateProduct(101, {
      name: 'Oak Dining Table Updated',
      variantGroups: [
        {
          id: 12,
          name: 'Size',
          options: [
            {
              id: 300,
              name: '120 cm',
              priceDelta: 100,
            },
            {
              name: '160 cm',
              priceDelta: 900,
              sortOrder: 4,
            },
          ],
        },
      ],
    } as any);

    expect(prisma.productVariantGroup.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { name: 'Size' },
    });
    expect(prisma.productVariantOption.update).toHaveBeenCalledWith({
      where: { id: 300 },
      data: {
        name: '120 cm',
        priceDelta: 100,
      },
    });
    expect(prisma.productVariantOption.create).toHaveBeenCalledWith({
      data: {
        groupId: 12,
        name: '160 cm',
        priceDelta: 900,
        sortOrder: 4,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 101,
        name: 'Oak Dining Table 120',
      }),
    );
  });

  it('soft deletes product and deactivates branch-product links', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue({
      id: 101,
      deletedAt: null,
    });
    prisma.branchProduct.updateMany.mockResolvedValue({ count: 3 });
    prisma.product.update.mockResolvedValue({
      id: 101,
    });
    const service = new ProductService(prisma as any);

    await service.removeProduct(101);

    expect(prisma.branchProduct.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 101,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: {
        deletedAt: expect.any(Date),
      },
    });
  });

  it('throws not found when restoring non-existing product', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue(null);
    const service = new ProductService(prisma as any);

    await expect(service.restoreProduct(777)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
