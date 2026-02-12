import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { PrismaService } from "src/core/database/prisma.service";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { Category, CategoryImage, Prisma } from "generated/prisma/client";
import { CategoryDto } from "./dto/category.dto";
import { GetCategoryDto } from "./dto/get.category.dto";
import { ImageCategoryDto } from "./dto/image.category.dto";
import { CreateCategoryDto } from "./dto/create.category.dto";
import { UpdateCategoryDto } from "./dto/update.category.dto";

@Injectable()
export class CategoryService {

    constructor(private readonly prisma: PrismaService) {}

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

    async getItem(filter: GetCategoryDto): Promise<CategoryDto | null> {
        const { id, slug } = filter;

        const where: any = {
            deletedAt: null,
        };

        if(id) where.id = id;
        if(slug) where.slug = slug;

        const category = await this.prisma.category.findFirst({
            where,
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

    async create(payload: CreateCategoryDto): Promise<CategoryDto> {
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

            return this.toDo(category);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async update(id: number, payload: UpdateCategoryDto): Promise<CategoryDto> {
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

            return this.toDo(category);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

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
