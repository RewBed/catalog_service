jest.mock('src/core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
  },
}));

jest.mock('generated/prisma/models', () => ({}));

import { BranchProductService } from './branch-product.service';

describe('BranchProductService DTO mapping', () => {
  const createDecimal = (value: number) => ({
    toNumber: () => value,
  });

  const service = new BranchProductService({} as any);

  it('includes short and technical descriptions with image metadata in branch product dto', () => {
    const dto = (service as any).toDto({
      id: 7001,
      productId: 101,
      branchId: 5,
      price: createDecimal(25990),
      stock: 20,
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
      },
    });

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
    });
  });
});
