import { Injectable } from "@nestjs/common";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { PrismaService } from "src/core/database/prisma.service";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { Category } from "generated/prisma/client";
import { CategoryDto } from "./dto/category.dto";
import { GetCategoryDto } from "./dto/get.category.dto";

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
        });

        return {
            items: categories.map(this.toDo),
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

        const category = await this.prisma.category.findUnique({where});

        if(!category)
            return null;

        return this.toDo(category);
    }

    private toDo(category: Category): CategoryDto {
        return {
            id: category.id,
            name: category.name,
            fullName: category.fullName ?? undefined,
            slug: category.slug,
            description: category.description ?? undefined,
            parentId: category.parentId ?? 0
        }
    }
}