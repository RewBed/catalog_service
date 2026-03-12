import { CategoryPaginationDto } from "../dto/category.pagination.dto";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { FilterCategoriesDto } from "../dto/filter.categories.dto";
import { CategoryService } from "../category.service";
import { CategoryDto } from "../dto/category.dto";
import {
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
} from "@nestjs/common";

@Controller('api/categories')
export class PublicCategoryController {

    constructor(private readonly categoryService: CategoryService) {}

    @Get()
    @ApiOperation({ operationId: 'getPublicCategories' })
    @ApiOkResponse({
        type: CategoryPaginationDto,
        links: {
            getCategoryByIdFromList: {
                operationId: 'getPublicCategoryById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
        },
    })
    async index(@Query() query: FilterCategoriesDto): Promise<CategoryPaginationDto> {
        return this.categoryService.getAll(query);
    }

    @Get(':id')
    @ApiOperation({ operationId: 'getPublicCategoryById' })
    @ApiOkResponse({ type: CategoryDto })
    async getItemById(@Param('id', ParseIntPipe) id: number): Promise<CategoryDto> {

        const category = await this.categoryService.getItemById(id);

        if(!category)
            throw new NotFoundException(`Category ${id} not found`);

        return category;
    }
}
