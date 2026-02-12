import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { CategoryPaginationDto } from "./dto/category.pagination.dto";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { FilterCategoriesDto } from "./dto/filter.categories.dto";
import { CategoryService } from "./category.service";
import { CategoryDto } from "./dto/category.dto";
import { GetCategoryDto } from "./dto/get.category.dto";
import { CreateCategoryDto } from "./dto/create.category.dto";
import { UpdateCategoryDto } from "./dto/update.category.dto";
import { GrpcAuthGuard } from "src/common/auth";

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

    @ApiBearerAuth()
    @ApiCreatedResponse({ type: CategoryDto })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateCategoryDto): Promise<CategoryDto> {
        return this.categoryService.create(payload);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: CategoryDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateCategoryDto,
    ): Promise<CategoryDto> {
        return this.categoryService.update(id, payload);
    }

    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.categoryService.remove(id);
    }
}
