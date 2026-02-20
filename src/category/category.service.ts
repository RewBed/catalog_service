import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { PrismaService } from "src/core/database/prisma.service";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { Category, CategoryImage, Prisma } from "generated/prisma/client";
import { CategoryDto } from "./dto/category.dto";
import { ImageCategoryDto } from "./dto/image.category.dto";
import { CreateCategoryDto } from "./dto/create.category.dto";
import { UpdateCategoryDto } from "./dto/update.category.dto";
import { AdminCategoryDto } from "./dto/admin/admin-category.dto";
import { AdminFilterCategoriesDto } from "./dto/admin/admin-filter.categories.dto";
import { AdminCategoryPaginationDto } from "./dto/admin/admin-category.pagination.dto";

@Injectable()
export class CategoryService {

    constructor(private readonly prisma: PrismaService) {}

    // получения списка категорий с фильтрацией для публичной версии
    async getAll(filter: FilterCategoriesDto): Promise<CategoryPaginationDto> {

        const { name, description, parentId, page, limit } = filter;

        const where: any = {
            deletedAt: null,
        };

        if (name) where.name = { contains: name, mode: 'insensitive' };
        if (description) where.description = { contains: description, mode: 'insensitive' };
        if (parentId !== undefined) where.parentId = parentId;

        // Считаем общее количество
        const total = await this.prisma.category.count({ where });

        // Получаем список категорий с пагинацией
        const categories = await this.prisma.category.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { sortOrder: 'asc' },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc'
                    }
                }
            }
        });

        return {
            items: categories.map(cat => this.toDo(cat)),
            meta: {
                limit: filter.limit,
                page: filter.page,
                total: total
            }
        }
    }

    // получения списка категорий с фильтрацией для админской версии
    async getAllAdmin(filter: AdminFilterCategoriesDto): Promise<AdminCategoryPaginationDto> {

        const { name, description, parentId, page, limit, isDeleted } = filter;

        const where: any = {
            deletedAt: isDeleted ? { not: null } : null,
        };

        if (name) where.name = { contains: name, mode: 'insensitive' };
        if (description) where.description = { contains: description, mode: 'insensitive' };
        if (parentId !== undefined) where.parentId = parentId;

        // Считаем общее количество
        const total = await this.prisma.category.count({ where });

        // Получаем список категорий с пагинацией
        const categories = await this.prisma.category.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { sortOrder: 'asc' },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc'
                    }
                }
            }
        });

        return {
            items: categories.map(cat => this.toDoAdmin(cat)),
            meta: {
                limit: filter.limit,
                page: filter.page,
                total: total
            }
        }
    }

    // получение категории по ID для публичной версии
    async getItemById(id: number): Promise<CategoryDto | null> {

        const category = await this.prisma.category.findFirst({
            where: {
                deletedAt: null,
                id
            },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc'
                    }
                }
            }
        });

        if(!category)
            return null;

        return this.toDo(category);
    }

    async getItemByIdAdmin(id: number): Promise<AdminCategoryDto | null> {

        const category = await this.prisma.category.findFirst({
            where: {
                deletedAt: null,
                id
            },
            include: {
                images: {
                    orderBy: {
                        sortOrder: 'asc'
                    }
                }
            }
        });

        if(!category)
            return null;

        return this.toDoAdmin(category);
    }

    // создание категории
    async create(payload: CreateCategoryDto): Promise<AdminCategoryDto> {
        const parentId = payload.parentId === 0 ? null : payload.parentId;

        if (parentId) {
            await this.ensureCategoryExists(parentId);
        }

        try {
            const category = await this.prisma.category.create({
                data: {
                    name: payload.name,
                    slug: payload.slug,
                    ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
                    ...(payload.description !== undefined ? { description: payload.description } : {}),
                    ...(parentId !== undefined ? { parentId } : {}),
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

            return this.toDoAdmin(category);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // обновление категории
    async update(id: number, payload: UpdateCategoryDto): Promise<AdminCategoryDto> {
        await this.ensureCategoryExists(id);

        if (payload.parentId === id) {
            throw new BadRequestException('Category cannot be a parent of itself');
        }

        const normalizedParentId = payload.parentId === 0 ? null : payload.parentId;
        if (normalizedParentId) {
            await this.ensureCategoryExists(normalizedParentId);
        }

        try {
            const category = await this.prisma.category.update({
                where: { id },
                data: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
                    ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
                    ...(payload.description !== undefined ? { description: payload.description } : {}),
                    ...(payload.parentId !== undefined ? { parentId: normalizedParentId } : {}),
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

            return this.toDoAdmin(category);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // удаление категории
    async remove(id: number): Promise<void> {
        await this.ensureCategoryExists(id);

        try {
            await this.prisma.$transaction([
                this.prisma.category.updateMany({
                    where: {
                        parentId: id,
                        deletedAt: null,
                    },
                    data: {
                        parentId: null,
                    },
                }),
                this.prisma.category.update({
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

    async restore(id: number): Promise<AdminCategoryDto> {
        await this.ensureCategoryExistsAny(id);

        try {
            const category = await this.prisma.category.update({
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

            return this.toDoAdmin(category);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private toDoAdmin(category: Category & {images: CategoryImage[]}): AdminCategoryDto {
        return {
            id: category.id,
            name: category.name,
            fullName: category.fullName ?? undefined,
            slug: category.slug,
            description: category.description ?? undefined,
            parentId: category.parentId ?? 0,
            images: category?.images?.map(img => this.categoryImageToDto(img)) ?? [],
            sortOrder: category?.sortOrder ?? 0,
            createdAt: category?.createdAt,
            updatedAt: category?.updatedAt,
            deletedAt: category.deletedAt ?? null
        }
    }

    private toDo(category: Category & {images: CategoryImage[]}): CategoryDto {
        return {
            id: category.id,
            name: category.name,
            fullName: category.fullName ?? undefined,
            slug: category.slug,
            description: category.description ?? undefined,
            parentId: category.parentId ?? 0,
            images: category?.images?.map(img => this.categoryImageToDto(img)) ?? []
        }
    }

    private categoryImageToDto(categoryImage: CategoryImage): ImageCategoryDto {
        return {
            url: categoryImage.url,
            type: categoryImage.type
        }
    }

    private async ensureCategoryExists(id: number): Promise<void> {
        const exists = await this.prisma.category.findUnique({
            where: { id },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!exists || exists.deletedAt) {
            throw new NotFoundException(`Category ${id} not found`);
        }
    }

    private async ensureCategoryExistsAny(id: number): Promise<void> {
        const exists = await this.prisma.category.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!exists) {
            throw new NotFoundException(`Category ${id} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Category with this slug already exists');
            }

            if (error.code === 'P2003') {
                throw new ConflictException('Category cannot be deleted or updated due to related entities');
            }
        }

        throw error;
    }
}
