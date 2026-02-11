import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { BranchProduct, Product, ProductImage } from "generated/prisma/client";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { GetProductDto } from "./dto/get.product.dto";
import { ImageProductDto } from "./dto/image.product.dto";

@Injectable()
export class ProductService {

    constructor(private readonly prisma: PrismaService) {}

    async getFilteredProducts(filter: FilterFrontProductDto): Promise<FrontProductPaginationDto> {
        const { page, limit, branchId, name, minPrice, maxPrice, categoryId } = filter;

        const where: any = {};

        if(branchId) where.branchId = branchId;

        if(minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if(minPrice !== undefined) where.price.gte = minPrice;
            if(maxPrice !== undefined) where.price.lte = maxPrice;
        }

        // поиск по имени и slug через product
        const branchProducts = await this.prisma.branchProduct.findMany({
            where: {
                branchId: branchId ?? undefined,
                isActive: true,
                price: {
                    gte: minPrice ?? undefined,
                    lte: maxPrice ?? undefined,
                },
                // Фильтр по полям связанной модели
                productItem: {
                    // через вложенный AND
                    AND: [
                        name ? { name: { contains: name } } : {},
                        categoryId ? { categoryId: categoryId } : {},
                    ],
                },
            },
            include: {
                productItem: {
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc'
                            }
                        }
                    }
                },
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: branchProducts.map(bp => this.branchProductToFront(bp)),
            meta: {
                total: 0,
                limit: limit,
                page: page
            }
        };
    }

    async getItem(filter: GetProductDto): Promise<FrontProductDto | null> {
        
        const { branchProductid, slug, branchId } = filter;

        const where: any = {};

        if (branchProductid) {
            // Поиск по id товарной позиции
            where.id = branchProductid;
            if (branchId !== undefined) {
                where.branchId = branchId;
            }
        } 
        else if (slug) {
            // Поиск по slug в конкретном филиале
            if (branchId !== undefined) {
                where.branchId = branchId;
            }
            where.productItem = { slug };
        }

        const branchProduct = await this.prisma.branchProduct.findFirst({
            where,
            include: {
                productItem: {
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc'
                            }
                        }
                    }
                },
            },
        });

        if(!branchProduct)
            return null;

        return this.branchProductToFront(branchProduct);
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
            images: branchProduct.productItem?.images?.map(img =>
                this.productImageToDto(img)
            ) ?? []
        };
    }

    private productImageToDto(productImage: ProductImage): ImageProductDto {
        return {
            url: productImage.url,
            type: productImage.type
        }
    }
}