import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import {
    Prisma,
    Product,
    ProductVariantGroup,
    ProductVariantOption,
} from 'generated/prisma/client';
import { ProductVariantGroupDto } from './dto/variant/product-variant-group.dto';
import { ProductVariantOptionDto } from './dto/variant/product-variant-option.dto';
import { AdminProductVariantGroupDto } from './dto/variant/admin-product-variant-group.dto';
import { AdminProductVariantOptionDto } from './dto/variant/admin-product-variant-option.dto';
import { CreateProductVariantGroupDto } from './dto/variant/create-product-variant-group.dto';
import { UpdateProductVariantGroupDto } from './dto/variant/update-product-variant-group.dto';
import { CreateProductVariantOptionDto } from './dto/variant/create-product-variant-option.dto';
import { UpdateProductVariantOptionDto } from './dto/variant/update-product-variant-option.dto';
import { ProductVariantPriceDto } from './dto/variant/product-variant-price.dto';
import { AdminFilterProductVariantGroupDto } from './dto/variant/admin-filter-product-variant-group.dto';

@Injectable()
export class ProductVariantService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllPublic(productId: number): Promise<ProductVariantGroupDto[]> {
        await this.ensureProductExists(productId, true);

        const groups = await this.prisma.productVariantGroup.findMany({
            where: {
                productId,
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

        return groups.map((group) => this.toPublicGroupDto(group));
    }

    async getPricePublic(productId: number, optionIds: number[]): Promise<ProductVariantPriceDto> {
        const product = await this.ensureProductExists(productId, true);
        const deduplicatedOptionIds = Array.from(new Set(optionIds));

        const groups = await this.prisma.productVariantGroup.findMany({
            where: {
                productId,
                isActive: true,
            },
            include: {
                options: {
                    where: { isActive: true },
                },
            },
        });

        const requiredGroupIds = new Set(
            groups.filter((group) => group.isRequired).map((group) => group.id),
        );

        if (deduplicatedOptionIds.length === 0) {
            if (requiredGroupIds.size > 0) {
                throw new BadRequestException('Required variant options are missing');
            }

            const basePrice = product.price?.toNumber() ?? 0;
            return {
                productId,
                basePrice,
                optionsPrice: 0,
                finalPrice: basePrice,
                selectedOptions: [],
            };
        }

        const selectedOptions = await this.prisma.productVariantOption.findMany({
            where: {
                id: { in: deduplicatedOptionIds },
                isActive: true,
                group: {
                    isActive: true,
                    productId,
                },
            },
        });

        if (selectedOptions.length !== deduplicatedOptionIds.length) {
            throw new BadRequestException('Some selected options are invalid for this product');
        }

        const selectedGroupIds = new Set<number>();
        for (const option of selectedOptions) {
            if (selectedGroupIds.has(option.groupId)) {
                throw new BadRequestException('Only one option per variant group can be selected');
            }

            selectedGroupIds.add(option.groupId);
        }

        for (const requiredGroupId of requiredGroupIds) {
            if (!selectedGroupIds.has(requiredGroupId)) {
                throw new BadRequestException('Required variant options are missing');
            }
        }

        const basePrice = product.price?.toNumber() ?? 0;
        const optionsPrice = selectedOptions.reduce(
            (sum, option) => sum + (option.priceDelta?.toNumber() ?? 0),
            0,
        );

        return {
            productId,
            basePrice,
            optionsPrice,
            finalPrice: basePrice + optionsPrice,
            selectedOptions: selectedOptions.map((option) => this.toPublicOptionDto(option)),
        };
    }

    async getAllAdmin(
        productId: number,
        filter: AdminFilterProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto[]> {
        await this.ensureProductExists(productId, false);

        const groups = await this.prisma.productVariantGroup.findMany({
            where: {
                productId,
                ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            include: {
                options: {
                    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
            },
        });

        return groups.map((group) => this.toAdminGroupDto(group));
    }

    async getGroupAdmin(productId: number, groupId: number): Promise<AdminProductVariantGroupDto | null> {
        const group = await this.prisma.productVariantGroup.findFirst({
            where: {
                id: groupId,
                productId,
            },
            include: {
                options: {
                    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
            },
        });

        if (!group) {
            return null;
        }

        return this.toAdminGroupDto(group);
    }

    async createGroup(
        productId: number,
        payload: CreateProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto> {
        await this.ensureProductExists(productId, false);

        try {
            const group = await this.prisma.productVariantGroup.create({
                data: {
                    productId,
                    name: payload.name,
                    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    ...(payload.isRequired !== undefined ? { isRequired: payload.isRequired } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
                include: {
                    options: {
                        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                    },
                },
            });

            return this.toAdminGroupDto(group);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async updateGroup(
        productId: number,
        groupId: number,
        payload: UpdateProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto> {
        await this.ensureGroupExists(groupId, productId, false);

        try {
            const group = await this.prisma.productVariantGroup.update({
                where: { id: groupId },
                data: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    ...(payload.isRequired !== undefined ? { isRequired: payload.isRequired } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
                include: {
                    options: {
                        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                    },
                },
            });

            return this.toAdminGroupDto(group);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async removeGroup(productId: number, groupId: number): Promise<void> {
        await this.ensureGroupExists(groupId, productId, true);

        await this.prisma.$transaction([
            this.prisma.productVariantOption.updateMany({
                where: { groupId },
                data: { isActive: false },
            }),
            this.prisma.productVariantGroup.update({
                where: { id: groupId },
                data: { isActive: false },
            }),
        ]);
    }

    async restoreGroup(productId: number, groupId: number): Promise<AdminProductVariantGroupDto> {
        await this.ensureGroupExists(groupId, productId, false, true);

        try {
            const group = await this.prisma.productVariantGroup.update({
                where: { id: groupId },
                data: { isActive: true },
                include: {
                    options: {
                        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                    },
                },
            });

            return this.toAdminGroupDto(group);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async createOption(
        productId: number,
        groupId: number,
        payload: CreateProductVariantOptionDto,
    ): Promise<AdminProductVariantOptionDto> {
        await this.ensureGroupExists(groupId, productId, false);

        try {
            const option = await this.prisma.productVariantOption.create({
                data: {
                    groupId,
                    name: payload.name,
                    ...(payload.priceDelta !== undefined ? { priceDelta: payload.priceDelta } : {}),
                    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toAdminOptionDto(option);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async updateOption(
        productId: number,
        groupId: number,
        optionId: number,
        payload: UpdateProductVariantOptionDto,
    ): Promise<AdminProductVariantOptionDto> {
        await this.ensureGroupExists(groupId, productId, false);
        await this.ensureOptionExists(optionId, groupId, false);

        try {
            const option = await this.prisma.productVariantOption.update({
                where: { id: optionId },
                data: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.priceDelta !== undefined ? { priceDelta: payload.priceDelta } : {}),
                    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toAdminOptionDto(option);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async removeOption(productId: number, groupId: number, optionId: number): Promise<void> {
        await this.ensureGroupExists(groupId, productId, false);
        await this.ensureOptionExists(optionId, groupId, true);

        await this.prisma.productVariantOption.update({
            where: { id: optionId },
            data: { isActive: false },
        });
    }

    async restoreOption(
        productId: number,
        groupId: number,
        optionId: number,
    ): Promise<AdminProductVariantOptionDto> {
        await this.ensureGroupExists(groupId, productId, false);
        await this.ensureOptionExists(optionId, groupId, false, true);

        const option = await this.prisma.productVariantOption.update({
            where: { id: optionId },
            data: { isActive: true },
        });

        return this.toAdminOptionDto(option);
    }

    private toPublicGroupDto(
        group: ProductVariantGroup & { options?: ProductVariantOption[] },
    ): ProductVariantGroupDto {
        return {
            id: group.id,
            name: group.name,
            isRequired: group.isRequired,
            sortOrder: group.sortOrder,
            options: group.options?.map((option) => this.toPublicOptionDto(option)) ?? [],
        };
    }

    private toPublicOptionDto(option: ProductVariantOption): ProductVariantOptionDto {
        return {
            id: option.id,
            name: option.name,
            priceDelta: option.priceDelta?.toNumber() ?? 0,
            sortOrder: option.sortOrder,
        };
    }

    private toAdminGroupDto(
        group: ProductVariantGroup & { options?: ProductVariantOption[] },
    ): AdminProductVariantGroupDto {
        return {
            id: group.id,
            productId: group.productId,
            name: group.name,
            isRequired: group.isRequired,
            sortOrder: group.sortOrder,
            isActive: group.isActive,
            options: group.options?.map((option) => this.toAdminOptionDto(option)) ?? [],
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
        };
    }

    private toAdminOptionDto(option: ProductVariantOption): AdminProductVariantOptionDto {
        return {
            id: option.id,
            groupId: option.groupId,
            name: option.name,
            priceDelta: option.priceDelta?.toNumber() ?? 0,
            sortOrder: option.sortOrder,
            isActive: option.isActive,
            createdAt: option.createdAt,
            updatedAt: option.updatedAt,
        };
    }

    private async ensureProductExists(
        id: number,
        activeOnly: boolean,
    ): Promise<Pick<Product, 'id' | 'price'>> {
        const product = await this.prisma.product.findFirst({
            where: {
                id,
                ...(activeOnly ? { deletedAt: null } : {}),
            },
            select: {
                id: true,
                price: true,
            },
        });

        if (!product) {
            throw new NotFoundException(`Product ${id} not found`);
        }

        return product;
    }

    private async ensureGroupExists(
        id: number,
        productId: number,
        mustBeActive: boolean,
        includeInactive = false,
    ): Promise<void> {
        const group = await this.prisma.productVariantGroup.findFirst({
            where: {
                id,
                productId,
                ...(includeInactive ? {} : mustBeActive ? { isActive: true } : {}),
            },
            select: {
                id: true,
            },
        });

        if (!group) {
            throw new NotFoundException(`Product variant group ${id} not found`);
        }
    }

    private async ensureOptionExists(
        id: number,
        groupId: number,
        mustBeActive: boolean,
        includeInactive = false,
    ): Promise<void> {
        const option = await this.prisma.productVariantOption.findFirst({
            where: {
                id,
                groupId,
                ...(includeInactive ? {} : mustBeActive ? { isActive: true } : {}),
            },
            select: {
                id: true,
            },
        });

        if (!option) {
            throw new NotFoundException(`Product variant option ${id} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Variant name already exists in this product');
            }

            if (error.code === 'P2003') {
                throw new ConflictException('Variant has invalid relations');
            }
        }

        throw error;
    }
}
