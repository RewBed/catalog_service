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

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ProductVariantService } from './product-variant.service';

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

const createPrismaMock = () => ({
  $transaction: jest.fn(),
  product: {
    findFirst: jest.fn(),
  },
  productVariantGroup: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  productVariantOption: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('ProductVariantService', () => {
  it('returns public groups and active options', async () => {
    const prisma = createPrismaMock();
    prisma.product.findFirst.mockResolvedValue({
      id: 101,
      price: createDecimal(24990),
    });
    prisma.productVariantGroup.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'Size',
        isRequired: true,
        sortOrder: 1,
        options: [
          {
            id: 20,
            name: '120 cm',
            priceDelta: createDecimal(0),
            sortOrder: 1,
          },
        ],
      },
    ]);
    const service = new ProductVariantService(prisma as any);

    const result = await service.getAllPublic(101);

    expect(prisma.productVariantGroup.findMany).toHaveBeenCalledWith({
      where: {
        productId: 101,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        options: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    expect(result).toEqual([
      {
        id: 10,
        name: 'Size',
        isRequired: true,
        sortOrder: 1,
        options: [
          {
            id: 20,
            name: '120 cm',
            priceDelta: 0,
            sortOrder: 1,
          },
        ],
      },
    ]);
  });

  it('rejects price request when required groups are missing', async () => {
    const prisma = createPrismaMock();
    prisma.product.findFirst.mockResolvedValue({
      id: 101,
      price: createDecimal(24990),
    });
    prisma.productVariantGroup.findMany.mockResolvedValue([
      {
        id: 10,
        productId: 101,
        isRequired: true,
        options: [],
      },
    ]);
    const service = new ProductVariantService(prisma as any);

    await expect(service.getPricePublic(101, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('calculates final price for valid selected options', async () => {
    const prisma = createPrismaMock();
    prisma.product.findFirst.mockResolvedValue({
      id: 101,
      price: createDecimal(100),
    });
    prisma.productVariantGroup.findMany.mockResolvedValue([
      {
        id: 10,
        productId: 101,
        isRequired: true,
        options: [],
      },
      {
        id: 11,
        productId: 101,
        isRequired: false,
        options: [],
      },
    ]);
    prisma.productVariantOption.findMany.mockResolvedValue([
      {
        id: 30,
        groupId: 10,
        name: 'Large',
        priceDelta: createDecimal(20),
        sortOrder: 1,
      },
      {
        id: 31,
        groupId: 11,
        name: 'Extra cheese',
        priceDelta: createDecimal(5),
        sortOrder: 2,
      },
    ]);
    const service = new ProductVariantService(prisma as any);

    const result = await service.getPricePublic(101, [30, 31, 31]);

    expect(result).toEqual({
      productId: 101,
      basePrice: 100,
      optionsPrice: 25,
      finalPrice: 125,
      selectedOptions: [
        {
          id: 30,
          name: 'Large',
          priceDelta: 20,
          sortOrder: 1,
        },
        {
          id: 31,
          name: 'Extra cheese',
          priceDelta: 5,
          sortOrder: 2,
        },
      ],
    });
  });

  it('throws bad request when option ids contain invalid option for product', async () => {
    const prisma = createPrismaMock();
    prisma.product.findFirst.mockResolvedValue({
      id: 101,
      price: createDecimal(100),
    });
    prisma.productVariantGroup.findMany.mockResolvedValue([]);
    prisma.productVariantOption.findMany.mockResolvedValue([
      {
        id: 30,
        groupId: 10,
        name: 'Large',
        priceDelta: createDecimal(20),
        sortOrder: 1,
      },
    ]);
    const service = new ProductVariantService(prisma as any);

    await expect(service.getPricePublic(101, [30, 31])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates group and maps conflict errors', async () => {
    const prisma = createPrismaMock();
    prisma.product.findFirst.mockResolvedValue({
      id: 101,
      price: createDecimal(100),
    });
    prisma.productVariantGroup.create.mockRejectedValue(createPrismaError('P2002'));
    const service = new ProductVariantService(prisma as any);

    await expect(
      service.createGroup(101, {
        name: 'Size',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes group with all options', async () => {
    const prisma = createPrismaMock();
    prisma.productVariantGroup.findFirst.mockResolvedValue({
      id: 10,
    });
    prisma.productVariantOption.updateMany.mockResolvedValue({ count: 2 });
    prisma.productVariantGroup.update.mockResolvedValue({
      id: 10,
    });
    prisma.$transaction.mockResolvedValue(undefined);
    const service = new ProductVariantService(prisma as any);

    await service.removeGroup(101, 10);

    expect(prisma.productVariantOption.updateMany).toHaveBeenCalledWith({
      where: { groupId: 10 },
      data: { isActive: false },
    });
    expect(prisma.productVariantGroup.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isActive: false },
    });
  });

  it('restores option and returns admin dto', async () => {
    const prisma = createPrismaMock();
    prisma.productVariantGroup.findFirst.mockResolvedValue({
      id: 10,
    });
    prisma.productVariantOption.findFirst.mockResolvedValue({
      id: 30,
    });
    prisma.productVariantOption.update.mockResolvedValue({
      id: 30,
      groupId: 10,
      name: 'Large',
      priceDelta: createDecimal(20),
      sortOrder: 1,
      isActive: true,
      createdAt: new Date('2026-03-10T10:00:00.000Z'),
      updatedAt: new Date('2026-03-10T10:01:00.000Z'),
    });
    const service = new ProductVariantService(prisma as any);

    const result = await service.restoreOption(101, 10, 30);

    expect(result).toEqual(
      expect.objectContaining({
        id: 30,
        groupId: 10,
        name: 'Large',
        priceDelta: 20,
        isActive: true,
      }),
    );
  });
});
