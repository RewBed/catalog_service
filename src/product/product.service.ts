import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { BranchProduct, Prisma, Product, ProductImage } from "generated/prisma/client";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { GetProductDto } from "./dto/get.product.dto";
import { ImageProductDto } from "./dto/image.product.dto";
import { CreateProductDto } from "./dto/create.product.dto";
import { UpdateProductDto } from "./dto/update.product.dto";
import { ProductDto } from "./dto/product.dto";

@Injectable()
export class ProductService {

    constructor(private readonly prisma: PrismaService) {}

    async getFilteredProducts(filter: FilterFrontProductDto): Promise<FrontProductPaginationDto> {
        const { page, limit, branchId, name, minPrice, maxPrice, categoryId } = filter;

        const branchProducts = await this.prisma.branchProduct.findMany({
            where: {
                branchId: branchId ?? undefined,
                isActive: true,
                branch: {
                    isActive: true,
                },
                price: {
                    gte: minPrice ?? undefined,
                    lte: maxPrice ?? undefined,
                },
                productItem: {
                    AND: [
                        name ? { name: { contains: name } } : {},
                        categoryId ? { categoryId: categoryId } : {},
                        { deletedAt: null },
                        { category: { deletedAt: null } },
                    ],
                },
            },
            include: {
                productItem: {
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc',
                            },
                        },
                    },
                },
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: branchProducts.map((bp) => this.branchProductToFront(bp)),
            meta: {
                total: 0,
                limit,
                page,
            },
        };
    }

    async getItem(filter: GetProductDto): Promise<FrontProductDto | null> {

        const { branchProductid, slug, branchId } = filter;

        const where: any = {
            branch: {
                isActive: true,
            },
            productItem: {
                deletedAt: null,
                category: {
                    deletedAt: null,
                },
            },
        };

        if (branchProductid) {
            where.id = branchProductid;
            if (branchId !== undefined) {
                where.branchId = branchId;
            }
        } else if (slug) {
            if (branchId !== undefined) {
                where.branchId = branchId;
            }
            where.productItem = {
                slug,
                deletedAt: null,
                category: {
                    deletedAt: null,
                },
            };
        }

        const branchProduct = await this.prisma.branchProduct.findFirst({
            where,
            include: {
                productItem: {
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc',
                            },
                        },
                    },
                },
            },
        });

        if (!branchProduct) {
            return null;
        }

        return this.branchProductToFront(branchProduct);
    }

    async getAllProducts(): Promise<ProductDto[]> {
        const products = await this.prisma.product.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                sortOrder: 'asc',
            },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
        });

        return products.map((product) => this.productToDto(product));
    }

    async getProductById(id: number): Promise<ProductDto | null> {
        const product = await this.prisma.product.findFirst({
            where: {
                id,
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

        if (!product) {
            return null;
        }

        return this.productToDto(product);
    }

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

    private branchProductToFront(branchProduct: BranchProduct & {productItem?: Product & { images?: ProductImage[] }}): FrontProductDto {
        return {
            id: branchProduct.id,
            productId: branchProduct.productId,
            name: branchProduct.productItem?.name ?? 'Unknown',
            fullName: branchProduct.productItem?.fullName ?? '',
            slug: branchProduct.productItem?.slug ?? '',
            description: branchProduct.productItem?.description ?? '',
            price: (branchProduct.price ?? branchProduct.productItem?.price ?? 0).toNumber(),
            stock: branchProduct.stock,
            images: branchProduct.productItem?.images?.map((img) =>
                this.productImageToDto(img),
            ) ?? [],
        };
    }

    private productImageToDto(productImage: ProductImage): ImageProductDto {
        return {
            url: productImage.url,
            type: productImage.type,
        };
    }

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
