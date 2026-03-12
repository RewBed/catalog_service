import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BranchProduct,
  Prisma,
  Product,
  ProductCollection,
  ProductCollectionItem,
  ProductImage,
} from 'generated/prisma/client';
import { BranchProductDto } from 'src/branch-product/dto/branch-product.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { AdminCollectionDto } from './dto/admin/admin-collection.dto';
import { AdminCollectionPaginationDto } from './dto/admin/admin-collection.pagination.dto';
import { AdminFilterCollectionDto } from './dto/admin/admin-filter.collection.dto';
import { CreateCollectionDto } from './dto/create.collection.dto';
import { PublicCollectionDto } from './dto/public-collection.dto';
import { UpdateCollectionDto } from './dto/update.collection.dto';

const ADMIN_COLLECTION_INCLUDE = {
  items: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
        },
      },
    },
  },
} satisfies Prisma.ProductCollectionInclude;

type ProductPreview = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
};

type CollectionWithItems = ProductCollection & {
  items: (ProductCollectionItem & {
    product: ProductPreview;
  })[];
};

type BranchProductWithRelations = BranchProduct & {
  productItem?: Product & {
    category?: {
      name: string;
    };
    images?: ProductImage[];
  };
};

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllAdmin(
    filter: AdminFilterCollectionDto,
  ): Promise<AdminCollectionPaginationDto> {
    const { title, description, isDeleted, page, limit } = filter;

    const where: Prisma.ProductCollectionWhereInput = {
      deletedAt: isDeleted ? { not: null } : null,
    };

    if (title) {
      where.title = { contains: title, mode: 'insensitive' };
    }

    if (description) {
      where.description = { contains: description, mode: 'insensitive' };
    }

    const total = await this.prisma.productCollection.count({ where });
    const collections = await this.prisma.productCollection.findMany({
      where,
      orderBy: { id: 'asc' },
      include: ADMIN_COLLECTION_INCLUDE,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: collections.map((collection) => this.toAdminDto(collection)),
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async getItemAdmin(id: number): Promise<AdminCollectionDto | null> {
    const collection = await this.prisma.productCollection.findUnique({
      where: { id },
      include: ADMIN_COLLECTION_INCLUDE,
    });

    if (!collection) {
      return null;
    }

    return this.toAdminDto(collection);
  }

  async getPublicItem(
    collectionId: number,
    branchId: number,
  ): Promise<PublicCollectionDto | null> {
    const collection = await this.prisma.productCollection.findFirst({
      where: {
        id: collectionId,
        deletedAt: null,
      },
      include: {
        items: {
          where: {
            product: {
              deletedAt: null,
            },
          },
          select: {
            productId: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!collection) {
      return null;
    }

    await this.ensureBranchExists(branchId);

    const orderedProductIds = collection.items.map((item) => item.productId);

    if (orderedProductIds.length === 0) {
      return {
        id: collection.id,
        title: collection.title,
        description: collection.description ?? undefined,
        products: [],
      };
    }

    const itemsOrder = new Map<number, number>();
    collection.items.forEach((item, index) => {
      itemsOrder.set(item.productId, index);
    });

    const branchProducts = await this.prisma.branchProduct.findMany({
      where: {
        branchId,
        isActive: true,
        branch: { isActive: true },
        productId: { in: orderedProductIds },
        productItem: { deletedAt: null },
      },
      include: {
        productItem: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
            images: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    branchProducts.sort((left, right) => {
      const leftOrder = itemsOrder.get(left.productId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = itemsOrder.get(right.productId) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.id - right.id;
    });

    return {
      id: collection.id,
      title: collection.title,
      description: collection.description ?? undefined,
      products: branchProducts.map((item) => this.toBranchProductDto(item)),
    };
  }

  async create(payload: CreateCollectionDto): Promise<AdminCollectionDto> {
    const productIds = this.normalizeProductIds(payload.productIds);

    await this.ensureProductsExist(productIds);

    try {
      const collection = await this.prisma.productCollection.create({
        data: {
          title: payload.title,
          ...(payload.description !== undefined
            ? { description: payload.description }
            : {}),
          ...(productIds.length > 0
            ? {
                items: {
                  create: productIds.map((productId, index) => ({
                    productId,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: ADMIN_COLLECTION_INCLUDE,
      });

      return this.toAdminDto(collection);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: number,
    payload: UpdateCollectionDto,
  ): Promise<AdminCollectionDto> {
    await this.ensureCollectionExists(id);

    const productIds =
      payload.productIds !== undefined
        ? this.normalizeProductIds(payload.productIds)
        : undefined;

    if (productIds !== undefined) {
      await this.ensureProductsExist(productIds);
    }

    try {
      const collection = await this.prisma.$transaction(async (tx) => {
        await tx.productCollection.update({
          where: { id },
          data: {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined
              ? { description: payload.description }
              : {}),
          },
        });

        if (productIds !== undefined) {
          await tx.productCollectionItem.deleteMany({
            where: { collectionId: id },
          });

          if (productIds.length > 0) {
            await tx.productCollectionItem.createMany({
              data: productIds.map((productId, index) => ({
                collectionId: id,
                productId,
                sortOrder: index,
              })),
            });
          }
        }

        const updated = await tx.productCollection.findUnique({
          where: { id },
          include: ADMIN_COLLECTION_INCLUDE,
        });

        if (!updated) {
          throw new NotFoundException(`Collection ${id} not found`);
        }

        return updated;
      });

      return this.toAdminDto(collection);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<void> {
    await this.ensureCollectionExists(id);

    try {
      await this.prisma.productCollection.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private toAdminDto(collection: CollectionWithItems): AdminCollectionDto {
    const productIds = collection.items.map((item) => item.productId);

    return {
      id: collection.id,
      title: collection.title,
      description: collection.description ?? undefined,
      productIds,
      products: collection.items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku ?? undefined,
      })),
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      deletedAt: collection.deletedAt ?? null,
    };
  }

  private toBranchProductDto(item: BranchProductWithRelations): BranchProductDto {
    return {
      id: item.id,
      productId: item.productId ?? item.productItem?.id ?? 0,
      categoryId: item.productItem?.categoryId ?? 0,
      categoryName: item.productItem?.category?.name ?? '',
      branchId: item.branchId,
      price: item.price?.toNumber() ?? item.productItem?.price?.toNumber() ?? 0,
      stock: item.stock,
      name: item.productItem?.name ?? '',
      sku: item.productItem?.sku ?? undefined,
      description: item.productItem?.description ?? undefined,
      slug: item.productItem?.slug ?? '',
      images: this.mapProductImages(item.productItem?.images),
    };
  }

  private mapProductImages(images?: ProductImage[]): { url: string; type: string }[] {
    if (!images || images.length === 0) {
      return [];
    }

    return images.map((image) => ({
      url: image.url,
      type: image.type,
    }));
  }

  private normalizeProductIds(productIds?: number[]): number[] {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    return [...new Set(productIds)];
  }

  private async ensureCollectionExists(id: number): Promise<void> {
    const collection = await this.prisma.productCollection.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!collection || collection.deletedAt) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
  }

  private async ensureBranchExists(id: number): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!branch || !branch.isActive) {
      throw new NotFoundException(`Branch ${id} not found`);
    }
  }

  private async ensureProductsExist(productIds: number[]): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (products.length === productIds.length) {
      return;
    }

    const existingProductIds = new Set(products.map((product) => product.id));
    const missingProductIds = productIds.filter((id) => !existingProductIds.has(id));

    throw new NotFoundException(`Products not found: ${missingProductIds.join(', ')}`);
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Collection already has duplicate product links');
      }

      if (error.code === 'P2003') {
        throw new ConflictException('Collection has invalid relations');
      }
    }

    throw error;
  }
}
