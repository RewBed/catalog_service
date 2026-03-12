import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CategoryService } from "../category.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
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
    @ApiOperation({ operationId: 'getAdminCategories' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: AdminCategoryPaginationDto,
        links: {
            getAdminCategoryByIdFromList: {
                operationId: 'getAdminCategoryById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
        },
    })
    async index(@Query() query: AdminFilterCategoriesDto): Promise<AdminCategoryPaginationDto> {
        return this.categoryService.getAllAdmin(query);
    }

    @Get(':id')
    @ApiOperation({ operationId: 'getAdminCategoryById' })
    @ApiOkResponse({
        type: AdminCategoryDto,
        links: {
            getPublicCategoryByIdFromAdmin: {
                operationId: 'getPublicCategoryById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    async getItemById(@Param('id', ParseIntPipe) id: number): Promise<AdminCategoryDto> {

        const category = await this.categoryService.getItemByIdAdmin(id);

        if(!category)
            throw new NotFoundException(`Category ${id} not found`);

        return category;
    }

    @Post()
    @ApiOperation({ operationId: 'createAdminCategory' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiCreatedResponse({
        type: AdminCategoryDto,
        links: {
            getCreatedAdminCategory: {
                operationId: 'getAdminCategoryById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            updateCreatedAdminCategory: {
                operationId: 'updateAdminCategory',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            deleteCreatedAdminCategory: {
                operationId: 'deleteAdminCategory',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            restoreCreatedAdminCategory: {
                operationId: 'restoreAdminCategory',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    async create(@Body() payload: CreateCategoryDto): Promise<AdminCategoryDto> {
        return this.categoryService.create(payload);
    }

    @Patch(':id')
    @ApiOperation({ operationId: 'updateAdminCategory' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: AdminCategoryDto,
        links: {
            getUpdatedAdminCategory: {
                operationId: 'getAdminCategoryById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateCategoryDto): Promise<AdminCategoryDto> {
        return this.categoryService.update(id, payload);
    }

    @Delete(':id')
    @ApiOperation({ operationId: 'deleteAdminCategory' })
    @HttpCode(204)
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiNoContentResponse()
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.categoryService.remove(id);
    }

    @Patch(':id/restore')
    @ApiOperation({ operationId: 'restoreAdminCategory' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: AdminCategoryDto,
        links: {
            getRestoredAdminCategory: {
                operationId: 'getAdminCategoryById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    async restore(@Param('id', ParseIntPipe) id: number): Promise<AdminCategoryDto> {
        return this.categoryService.restore(id);
    }
}
