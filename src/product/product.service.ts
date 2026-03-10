import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { Prisma, Product, ProductImage } from "generated/prisma/client";
import { ImageProductDto } from "./dto/image.product.dto";
import { CreateProductDto } from "./dto/create.product.dto";
import { UpdateProductDto } from "./dto/update.product.dto";
import { ProductDto } from "./dto/product.dto";
import { ProductWhereInput } from "generated/prisma/models";
import { AdminProductPaginationDto } from "./dto/admin/admin.product.pagination.dto";
import { AdminFilterProductDto } from "./controllers/admin-filter.product.dto";

@Injectable()
export class ProductService {

    constructor(private readonly prisma: PrismaService) {}

    // получения списка товаров по фильтру
    async getFilteredProducts(filter: AdminFilterProductDto): Promise<AdminProductPaginationDto> {
        const { page, limit, name, minPrice, maxPrice, categoryId, isDeleted} = filter;

        console.log(isDeleted);

        const where: ProductWhereInput = {};

        if(name)
            where.name = { contains: name };

        if(minPrice || maxPrice) {
            where.price = {
                gte: minPrice ?? undefined,
                lte: maxPrice ?? undefined,
            }
        }

        if(categoryId)
            where.categoryId = categoryId;

        where.deletedAt = isDeleted ? { not: null } : null;

        const products = await this.prisma.product.findMany({
            where,
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: products.map((product) => this.productToDto(product)),
            meta: {
                total: 0,
                limit,
                page,
            },
        };
    }

    // получение товара по ID
    async getProductById(id: number): Promise<ProductDto | null> {
        const product = await this.prisma.product.findFirst({
            where: {
                id
            },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
        });

        if (!product) {
            return null;
        }

        return this.productToDto(product);
    }

    // создание товара
    async createProduct(payload: CreateProductDto): Promise<ProductDto> {
        await this.ensureCategoryExists(payload.categoryId);

        try {
            const product = await this.prisma.product.create({
                data: {
                    name: payload.name,
                    slug: payload.slug,
                    price: payload.price,
                    categoryId: payload.categoryId,
                    ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
                    ...(payload.description !== undefined ? { description: payload.description } : {}),
                    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    ...(payload.variantGroups !== undefined
                        ? {
                              variantGroups: {
                                  create: payload.variantGroups.map((group) => ({
                                      name: group.name,
                                      ...(group.sortOrder !== undefined ? { sortOrder: group.sortOrder } : {}),
                                      ...(group.isRequired !== undefined ? { isRequired: group.isRequired } : {}),
                                      ...(group.isActive !== undefined ? { isActive: group.isActive } : {}),
                                      ...(group.options !== undefined
                                          ? {
                                                options: {
                                                    create: group.options.map((option) => ({
                                                        name: option.name,
                                                        ...(option.priceDelta !== undefined
                                                            ? { priceDelta: option.priceDelta }
                                                            : {}),
                                                        ...(option.sortOrder !== undefined
                                                            ? { sortOrder: option.sortOrder }
                                                            : {}),
                                                        ...(option.isActive !== undefined
                                                            ? { isActive: option.isActive }
                                                            : {}),
                                                    })),
                                                },
                                            }
                                          : {}),
                                  })),
                              },
                          }
                        : {}),
                },
                include: {
                    images: {
                        orderBy: {
                            sortOrder: 'asc',
                        },
                    },
                },
            });

            return this.productToDto(product);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // обновление товара
    async updateProduct(id: number, payload: UpdateProductDto): Promise<ProductDto> {
        await this.ensureProductExists(id);

        if (payload.categoryId !== undefined) {
            await this.ensureCategoryExists(payload.categoryId);
        }

        try {
            const product = await this.prisma.$transaction(async (tx) => {
                const updatedProduct = await tx.product.update({
                    where: { id },
                    data: {
                        ...(payload.name !== undefined ? { name: payload.name } : {}),
                        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
                        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
                        ...(payload.description !== undefined ? { description: payload.description } : {}),
                        ...(payload.price !== undefined ? { price: payload.price } : {}),
                        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
                        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    },
                });

                if (payload.variantGroups !== undefined) {
                    for (const groupPayload of payload.variantGroups) {
                        let groupId = groupPayload.id;

                        if (groupId !== undefined) {
                            await this.ensureProductVariantGroupExists(tx, id, groupId);

                            await tx.productVariantGroup.update({
                                where: { id: groupId },
                                data: {
                                    ...(groupPayload.name !== undefined ? { name: groupPayload.name } : {}),
                                    ...(groupPayload.sortOrder !== undefined
                                        ? { sortOrder: groupPayload.sortOrder }
                                        : {}),
                                    ...(groupPayload.isRequired !== undefined
                                        ? { isRequired: groupPayload.isRequired }
                                        : {}),
                                    ...(groupPayload.isActive !== undefined
                                        ? { isActive: groupPayload.isActive }
                                        : {}),
                                },
                            });
                        } else {
                            if (!groupPayload.name) {
                                throw new BadRequestException(
                                    'Variant group name is required for new group',
                                );
                            }

                            const createdGroup = await tx.productVariantGroup.create({
                                data: {
                                    productId: id,
                                    name: groupPayload.name,
                                    ...(groupPayload.sortOrder !== undefined
                                        ? { sortOrder: groupPayload.sortOrder }
                                        : {}),
                                    ...(groupPayload.isRequired !== undefined
                                        ? { isRequired: groupPayload.isRequired }
                                        : {}),
                                    ...(groupPayload.isActive !== undefined
                                        ? { isActive: groupPayload.isActive }
                                        : {}),
                                },
                                select: { id: true },
                            });

                            groupId = createdGroup.id;
                        }

                        if (groupPayload.options !== undefined) {
                            for (const optionPayload of groupPayload.options) {
                                if (optionPayload.id !== undefined) {
                                    await this.ensureProductVariantOptionExists(
                                        tx,
                                        groupId,
                                        optionPayload.id,
                                    );

                                    await tx.productVariantOption.update({
                                        where: { id: optionPayload.id },
                                        data: {
                                            ...(optionPayload.name !== undefined
                                                ? { name: optionPayload.name }
                                                : {}),
                                            ...(optionPayload.priceDelta !== undefined
                                                ? { priceDelta: optionPayload.priceDelta }
                                                : {}),
                                            ...(optionPayload.sortOrder !== undefined
                                                ? { sortOrder: optionPayload.sortOrder }
                                                : {}),
                                            ...(optionPayload.isActive !== undefined
                                                ? { isActive: optionPayload.isActive }
                                                : {}),
                                        },
                                    });
                                } else {
                                    if (!optionPayload.name) {
                                        throw new BadRequestException(
                                            'Variant option name is required for new option',
                                        );
                                    }

                                    await tx.productVariantOption.create({
                                        data: {
                                            groupId,
                                            name: optionPayload.name,
                                            ...(optionPayload.priceDelta !== undefined
                                                ? { priceDelta: optionPayload.priceDelta }
                                                : {}),
                                            ...(optionPayload.sortOrder !== undefined
                                                ? { sortOrder: optionPayload.sortOrder }
                                                : {}),
                                            ...(optionPayload.isActive !== undefined
                                                ? { isActive: optionPayload.isActive }
                                                : {}),
                                        },
                                    });
                                }
                            }
                        }
                    }
                }

                return tx.product.findUnique({
                    where: { id: updatedProduct.id },
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc',
                            },
                        },
                    },
                });
            });

            if (!product) {
                throw new NotFoundException(`Product ${id} not found`);
            }

            return this.productToDto(product);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // удаление товара
    async removeProduct(id: number): Promise<void> {
        await this.ensureProductExists(id);

        try {
            await this.prisma.$transaction([
                this.prisma.branchProduct.updateMany({
                    where: {
                        productId: id,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                    },
                }),
                this.prisma.product.update({
                    where: { id },
                    data: {
                        deletedAt: new Date(),
                    },
                }),
            ]);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async restoreProduct(id: number): Promise<ProductDto> {
        await this.ensureProductExistsAny(id);

        try {
            const product = await this.prisma.product.update({
                where: { id },
                data: {
                    deletedAt: null,
                },
                include: {
                    images: {
                        orderBy: {
                            sortOrder: 'asc',
                        },
                    },
                },
            });

            return this.productToDto(product);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // преобразование изображения товара в дто
    private productImageToDto(productImage: ProductImage): ImageProductDto {
        return {
            url: productImage.url,
            type: productImage.type,
        };
    }

    // преобразование товара в дто
    private productToDto(product: Product & { images?: ProductImage[] }): ProductDto {
        return {
            id: product.id,
            name: product.name,
            fullName: product.fullName ?? undefined,
            slug: product.slug,
            description: product.description ?? undefined,
            price: product.price.toNumber(),
            categoryId: product.categoryId,
            sortOrder: product.sortOrder,
            images: product.images?.map((image) => this.productImageToDto(image)) ?? [],
        };
    }

    private async ensureCategoryExists(categoryId: number): Promise<void> {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category ${categoryId} not found`);
        }
    }

    private async ensureProductExists(id: number): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product ${id} not found`);
        }
    }

    private async ensureProductExistsAny(id: number): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!product) {
            throw new NotFoundException(`Product ${id} not found`);
        }
    }

    private async ensureProductVariantGroupExists(
        tx: Prisma.TransactionClient,
        productId: number,
        groupId: number,
    ): Promise<void> {
        const group = await tx.productVariantGroup.findFirst({
            where: {
                id: groupId,
                productId,
            },
            select: { id: true },
        });

        if (!group) {
            throw new NotFoundException(`Product variant group ${groupId} not found`);
        }
    }

    private async ensureProductVariantOptionExists(
        tx: Prisma.TransactionClient,
        groupId: number,
        optionId: number,
    ): Promise<void> {
        const option = await tx.productVariantOption.findFirst({
            where: {
                id: optionId,
                groupId,
            },
            select: { id: true },
        });

        if (!option) {
            throw new NotFoundException(`Product variant option ${optionId} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Product with this slug already exists');
            }

            if (error.code === 'P2003') {
                throw new ConflictException('Product has invalid relations');
            }
        }

        throw error;
    }
}

