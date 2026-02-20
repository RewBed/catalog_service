import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BranchProduct, Prisma, Product, ProductImage } from 'generated/prisma/client';
import { BranchProductWhereInput, ProductWhereInput } from 'generated/prisma/models';
import { PrismaService } from 'src/core/database/prisma.service';
import { BranchProductDto } from './dto/branch-product.dto';
import { BranchProductPaginationDto } from './dto/branch-product.pagination.dto';
import { CreateBranchProductDto } from './dto/create.branch-product.dto';
import { UpdateBranchProductDto } from './dto/update.branch-product.dto';
import { FilterBranchProductDto } from './dto/filter.branch-product.dto';
import { AdminFilterBranchProductDto } from './dto/admin/admin-filter.branch-product.dto';
import { AdminBranchProductPaginationDto } from './dto/admin/admin-branch-product.pagination.dto';
import { AdminBranchProductDto } from './dto/admin/admin-branch-product.dto';

@Injectable()
export class BranchProductService {
    constructor(private readonly prisma: PrismaService) {}

    async getAll(filter?: FilterBranchProductDto): Promise<BranchProductPaginationDto> {
        const { branchId, price, minPrice, maxPrice, name, description, categoryId } = filter ?? {};
        const page = filter?.page ?? 1;
        const limit = filter?.limit ?? 25;

        const productItemFilters: ProductWhereInput = {
            deletedAt: null,
        };

        if (name) {
            productItemFilters.name = { contains: name, mode: 'insensitive' };
        }

        if (description) {
            productItemFilters.description = { contains: description, mode: 'insensitive' };
        }

        if (categoryId !== undefined) {
            productItemFilters.categoryId = categoryId;
        }

        const where: BranchProductWhereInput = {
            isActive: true,
            branch: { isActive: true },
            productItem: productItemFilters,
        };

        if (branchId !== undefined) {
            where.branchId = branchId;
        }

        if (price !== undefined) {
            where.price = price;
        } else if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {
                gte: minPrice ?? undefined,
                lte: maxPrice ?? undefined,
            };
        }

        const total = await this.prisma.branchProduct.count({ where });

        const items = await this.prisma.branchProduct.findMany({
            where,
            orderBy: [
                { productItem: { sortOrder: 'asc' } },
                { price: 'asc' },
                { id: 'asc' },
            ],
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
            items: items.map((item) => this.toDto(item)),
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    async getAllAdmin(filter: AdminFilterBranchProductDto): Promise<AdminBranchProductPaginationDto> {
        const {
            id,
            productId,
            branchId,
            price,
            minPrice,
            maxPrice,
            stock,
            minStock,
            maxStock,
            isActive,
            createdAtFrom,
            createdAtTo,
            updatedAtFrom,
            updatedAtTo,
            page,
            limit,
        } = filter;

        const where: BranchProductWhereInput = {};

        if (id !== undefined) {
            where.id = id;
        }

        if (productId !== undefined) {
            where.productId = productId;
        }

        if (branchId !== undefined) {
            where.branchId = branchId;
        }

        if (price !== undefined) {
            where.price = price;
        } else if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {
                gte: minPrice ?? undefined,
                lte: maxPrice ?? undefined,
            };
        }

        if (stock !== undefined) {
            where.stock = stock;
        } else if (minStock !== undefined || maxStock !== undefined) {
            where.stock = {
                gte: minStock ?? undefined,
                lte: maxStock ?? undefined,
            };
        }

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        if (createdAtFrom !== undefined || createdAtTo !== undefined) {
            where.createdAt = {
                gte: createdAtFrom ?? undefined,
                lte: createdAtTo ?? undefined,
            };
        }

        if (updatedAtFrom !== undefined || updatedAtTo !== undefined) {
            where.updatedAt = {
                gte: updatedAtFrom ?? undefined,
                lte: updatedAtTo ?? undefined,
            };
        }

        const total = await this.prisma.branchProduct.count({ where });
        const items = await this.prisma.branchProduct.findMany({
            where,
            orderBy: { id: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: items.map((item) => this.toAdminDto(item)),
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    async getItem(id: number): Promise<BranchProductDto | null> {
        const item = await this.prisma.branchProduct.findFirst({
            where: {
                id,
                isActive: true,
                branch: { isActive: true },
                productItem: { deletedAt: null },
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
        });

        if (!item) {
            return null;
        }

        return this.toDto(item);
    }

    async getItemBySlug(slug: string, branchId: number): Promise<BranchProductDto | null> {
        const item = await this.prisma.branchProduct.findFirst({
            where: {
                branchId,
                isActive: true,
                branch: { isActive: true },
                productItem: {
                    deletedAt: null,
                    slug,
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
        });

        if (!item) {
            return null;
        }

        return this.toDto(item);
    }

    async getItemAdmin(id: number): Promise<AdminBranchProductDto | null> {
        const item = await this.prisma.branchProduct.findUnique({
            where: { id },
        });

        if (!item) {
            return null;
        }

        return this.toAdminDto(item);
    }

    async create(payload: CreateBranchProductDto): Promise<BranchProductDto> {
        await this.ensureBranchExists(payload.branchId);
        await this.ensureProductExists(payload.productId);

        try {
            const item = await this.prisma.branchProduct.create({
                data: {
                    productId: payload.productId,
                    branchId: payload.branchId,
                    price: payload.price,
                    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
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
            });

            return this.toDto(item);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async update(id: number, payload: UpdateBranchProductDto): Promise<BranchProductDto> {
        await this.ensureBranchProductExists(id);

        try {
            const item = await this.prisma.branchProduct.update({
                where: { id },
                data: {
                    ...(payload.price !== undefined ? { price: payload.price } : {}),
                    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
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
            });

            return this.toDto(item);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async remove(id: number): Promise<void> {
        await this.ensureBranchProductExists(id);

        try {
            await this.prisma.branchProduct.update({
                where: { id },
                data: {
                    isActive: false,
                },
            });
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async restore(id: number): Promise<AdminBranchProductDto> {
        await this.ensureBranchProductExistsAny(id);

        try {
            const item = await this.prisma.branchProduct.update({
                where: { id },
                data: {
                    isActive: true,
                },
            });

            return this.toAdminDto(item);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private toDto(item: BranchProduct & { productItem?: Product & { images?: ProductImage[] } }): BranchProductDto {
        return {
            id: item.id,
            branchId: item.branchId,
            price: item.price?.toNumber() ?? item.productItem?.price?.toNumber() ?? 0,
            stock: item.stock,
            name: item.productItem?.name ?? '',
            description: item.productItem?.description ?? undefined,
            slug: item.productItem?.slug ?? '',
            images: this.mapProductImages(item.productItem?.images),
        };
    }

    private toAdminDto(item: BranchProduct): AdminBranchProductDto {
        return {
            id: item.id,
            productId: item.productId,
            branchId: item.branchId,
            price: item.price?.toNumber() ?? 0,
            stock: item.stock,
            isActive: item.isActive,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
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

    private async ensureBranchProductExists(id: number): Promise<void> {
        const item = await this.prisma.branchProduct.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!item || !item.isActive) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }
    }

    private async ensureBranchProductExistsAny(id: number): Promise<void> {
        const item = await this.prisma.branchProduct.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!item) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('BranchProduct with this branch and product already exists');
            }

            if (error.code === 'P2003') {
                throw new ConflictException('BranchProduct has invalid relations');
            }
        }

        throw error;
    }
}
