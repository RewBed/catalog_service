import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CategoryService } from "../category.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { GrpcAuthGuard } from "src/common/auth";
import { CreateCategoryDto } from "../dto/create.category.dto";
import { UpdateCategoryDto } from "../dto/update.category.dto";
import { AdminCategoryDto } from "../dto/admin/admin-category.dto";
import { FilterCategoriesDto } from "../dto/filter.categories.dto";
import { AdminCategoryPaginationDto } from "../dto/admin/admin-category.pagination.dto";
import { AdminFilterCategoriesDto } from "../dto/admin/admin-filter.categories.dto";

@Controller('api/admin/categories')
export class AdminCategoryController {

    constructor(private readonly categoryService: CategoryService) {}

    @Get()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: AdminCategoryPaginationDto })
    async index(@Query() query: AdminFilterCategoriesDto): Promise<AdminCategoryPaginationDto> {
        return this.categoryService.getAllAdmin(query);
    }

    @Get(':id')
    @ApiOkResponse({ type: AdminCategoryDto })
    async getItemById(@Param('id', ParseIntPipe) id: number): Promise<AdminCategoryDto> {

        const category = await this.categoryService.getItemByIdAdmin(id);

        if(!category)
            throw new NotFoundException(`Category ${id} not found`);

        return category;
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiCreatedResponse({ type: AdminCategoryDto })
    async create(@Body() payload: CreateCategoryDto): Promise<AdminCategoryDto> {
        return this.categoryService.create(payload);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: AdminCategoryDto })
    async update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateCategoryDto): Promise<AdminCategoryDto> {
        return this.categoryService.update(id, payload);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiNoContentResponse()
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.categoryService.remove(id);
    }

    @Patch(':id/restore')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: AdminCategoryDto })
    async restore(@Param('id', ParseIntPipe) id: number): Promise<AdminCategoryDto> {
        return this.categoryService.restore(id);
    }
}
