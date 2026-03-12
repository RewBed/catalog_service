import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { BranchProductService } from "../branch-product.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BranchProductDto } from "../dto/branch-product.dto";
import { GrpcAuthGuard } from "src/common/auth";
import { CreateBranchProductDto } from "../dto/create.branch-product.dto";
import { UpdateBranchProductDto } from "../dto/update.branch-product.dto";
import { AdminFilterBranchProductDto } from "../dto/admin/admin-filter.branch-product.dto";
import { AdminBranchProductPaginationDto } from "../dto/admin/admin-branch-product.pagination.dto";
import { AdminBranchProductDto } from "../dto/admin/admin-branch-product.dto";

@Controller('api/admin/branch-products')
export class AdminBranchProductsController {
    constructor(private readonly branchProductService: BranchProductService) {}

    @ApiOperation({ operationId: 'getAdminBranchProducts' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchProductPaginationDto,
        links: {
            getAdminBranchProductByIdFromList: {
                operationId: 'getAdminBranchProductById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Get()
    async index(@Query() query: AdminFilterBranchProductDto): Promise<AdminBranchProductPaginationDto> {
        return this.branchProductService.getAllAdmin(query);
    }

    @ApiOperation({ operationId: 'getAdminBranchProductById' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchProductDto,
        links: {
            getProductFromAdminBranchProduct: {
                operationId: 'getAdminProductById',
                parameters: {
                    id: '$response.body#/productId',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchProductDto> {
        const item = await this.branchProductService.getItemAdmin(id);

        if (!item) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }

        return item;
    }

    @ApiOperation({ operationId: 'createAdminBranchProduct' })
    @ApiBearerAuth()
    @ApiCreatedResponse({
        type: BranchProductDto,
        links: {
            getCreatedAdminBranchProduct: {
                operationId: 'getAdminBranchProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            updateCreatedAdminBranchProduct: {
                operationId: 'updateAdminBranchProduct',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            deleteCreatedAdminBranchProduct: {
                operationId: 'deleteAdminBranchProduct',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            getCreatedAdminBranchProductPublicCard: {
                operationId: 'getPublicBranchProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateBranchProductDto): Promise<BranchProductDto> {
        return this.branchProductService.create(payload);
    }

    @ApiOperation({ operationId: 'updateAdminBranchProduct' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: BranchProductDto,
        links: {
            getUpdatedAdminBranchProduct: {
                operationId: 'getAdminBranchProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateBranchProductDto,
    ): Promise<BranchProductDto> {
        return this.branchProductService.update(id, payload);
    }

    @ApiOperation({ operationId: 'deleteAdminBranchProduct' })
    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.branchProductService.remove(id);
    }

    @ApiOperation({ operationId: 'restoreAdminBranchProduct' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchProductDto,
        links: {
            getRestoredAdminBranchProduct: {
                operationId: 'getAdminBranchProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id/restore')
    async restore(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchProductDto> {
        return this.branchProductService.restore(id);
    }
}
