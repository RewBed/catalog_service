import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

        if(isDeleted)
            where.deletedAt = { not: null }
        else
            where.deletedAt = null;

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
            const product = await this.prisma.product.update({
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
