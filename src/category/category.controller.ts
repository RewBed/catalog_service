import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { ApiOkResponse } from "@nestjs/swagger";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { CategoryService } from "./category.service";
import { CategoryDto } from "./dto/category.dto";
import { GetCategoryDto } from "./dto/get.category.dto";

@Controller('categories')
export class CategoryController {

    constructor(private readonly categoryService: CategoryService) {}

    @ApiOkResponse({ type: CategoryPaginationDto })
    @Get()
    async index(@Query() query: FilterCategoriesDto): Promise<CategoryPaginationDto> {
        return this.categoryService.getAll(query);
    }

    @ApiOkResponse({ type: CategoryDto })
    @Get('category')
    async getItem(@Query() query: GetCategoryDto): Promise<CategoryDto> {
        const category = await this.categoryService.getItem(query);

        if(!category)
            throw new NotFoundException(`Category ${query.id} not found`);

        return category;
    }
}