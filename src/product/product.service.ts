import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { BranchProduct, Product } from "generated/prisma/client";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";

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
                productItem: true, // подтягиваем данные товара
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: branchProducts.map(this.branchProductToFront),
            meta: {
                total: 0,
                limit: limit,
                page: page
            }
        };
    }

    private branchProductToFront(branchProduct: BranchProduct & { productItem?: Product }): FrontProductDto {
        return {
            id: branchProduct.id,
            productId: branchProduct.productId,
            name: branchProduct.productItem?.name ?? 'Unknown',
            fullName: branchProduct.productItem?.fullName ?? '',
            slug: branchProduct.productItem?.slug ?? '',
            description: branchProduct.productItem?.description ?? '',
            price: (branchProduct.price ?? branchProduct.productItem?.price ?? 0).toNumber(),
            stock: branchProduct.stock
        };
    }
}