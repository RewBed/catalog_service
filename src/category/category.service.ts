import { Injectable } from "@nestjs/common";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { PrismaService } from "src/core/database/prisma.service";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { Category, CategoryImage } from "generated/prisma/client";
import { CategoryDto } from "./dto/category.dto";
import { GetCategoryDto } from "./dto/get.category.dto";
import { ImageCategoryDto } from "./dto/image.category.dto";

@Injectable()
export class CategoryService {

    constructor(private readonly prisma: PrismaService) {}

    async getAll(filter: FilterCategoriesDto): Promise<CategoryPaginationDto> {

        const { name, description, parentId, page, limit } = filter;

        const where: any = {};

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

        const where: any = {}

        if(id) where.id = id;
        if(slug) where.slug = slug;

        const category = await this.prisma.category.findUnique({
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
}