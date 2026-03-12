import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ProductService } from "../product.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GrpcAuthGuard } from "src/common/auth";
import { ProductDto } from "../dto/product.dto";
import { CreateProductDto } from "../dto/create.product.dto";
import { UpdateProductDto } from "../dto/update.product.dto";
import { AdminProductPaginationDto } from "../dto/admin/admin.product.pagination.dto";
import { AdminFilterProductDto } from "./admin-filter.product.dto";

@Controller('api/admin/products')
@ApiTags('Admin Products')
export class AdminProductController {

    constructor(private readonly productService: ProductService) {}

    @ApiOperation({ operationId: 'getAdminProducts' })
    @Get()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: AdminProductPaginationDto,
        links: {
            getAdminProductByIdFromList: {
                operationId: 'getAdminProductById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
            getAdminProductVariantGroupsFromList: {
                operationId: 'listAdminProductVariantGroups',
                parameters: {
                    productId: '$response.body#/items/0/id',
                },
            },
            getPublicProductVariantGroupsFromList: {
                operationId: 'getPublicProductVariantGroups',
                parameters: {
                    productId: '$response.body#/items/0/id',
                },
            },
        },
    })
    async index(@Query() query: AdminFilterProductDto): Promise<AdminProductPaginationDto> {
        return this.productService.getFilteredProducts(query);
    }

    @ApiOperation({ operationId: 'getAdminProductById' })
    @Get(':id')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: ProductDto,
        links: {
            getAdminProductVariantGroups: {
                operationId: 'listAdminProductVariantGroups',
                parameters: {
                    productId: '$response.body#/id',
                },
            },
            getPublicProductVariantGroups: {
                operationId: 'getPublicProductVariantGroups',
                parameters: {
                    productId: '$response.body#/id',
                },
            },
        },
    })
    async getProduct(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {

        const product = await this.productService.getProductById(id);

        if(!product)
            throw new NotFoundException('Product not found');

        return product;
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOperation({
        operationId: 'createAdminProduct',
        summary: 'Create product',
        description: 'Supports optional nested variant groups and options in variantGroups[]',
    })
    @ApiCreatedResponse({
        type: ProductDto,
        links: {
            getCreatedAdminProduct: {
                operationId: 'getAdminProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            updateCreatedAdminProduct: {
                operationId: 'updateAdminProduct',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            deleteCreatedAdminProduct: {
                operationId: 'deleteAdminProduct',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            getCreatedAdminProductVariantGroups: {
                operationId: 'listAdminProductVariantGroups',
                parameters: {
                    productId: '$response.body#/id',
                },
            },
        },
    })
    async create(@Body() payload: CreateProductDto): Promise<ProductDto> {
        return this.productService.createProduct(payload);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOperation({
        operationId: 'updateAdminProduct',
        summary: 'Update product',
        description:
            'Supports optional nested variantGroups[] updates: with id updates existing group/option, without id creates new one',
    })
    @ApiOkResponse({
        type: ProductDto,
        links: {
            getUpdatedAdminProduct: {
                operationId: 'getAdminProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateProductDto): Promise<ProductDto> {
        return this.productService.updateProduct(id, payload);
    }

    @ApiOperation({ operationId: 'deleteAdminProduct' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiNoContentResponse()
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.productService.removeProduct(id);
    }

    @ApiOperation({ operationId: 'restoreAdminProduct' })
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({
        type: ProductDto,
        links: {
            getRestoredAdminProduct: {
                operationId: 'getAdminProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @Patch(':id/restore')
    async restore(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {
        return this.productService.restoreProduct(id);
    }
}
