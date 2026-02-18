import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ProductService } from "../product.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { GrpcAuthGuard } from "src/common/auth";
import { ProductDto } from "../dto/product.dto";
import { CreateProductDto } from "../dto/create.product.dto";
import { UpdateProductDto } from "../dto/update.product.dto";
import { AdminProductPaginationDto } from "../dto/admin/admin.product.pagination.dto";
import { AdminFilterProductDto } from "./admin-filter.product.dto";

@Controller('api/admin/products')
export class AdminProductController {

    constructor(private readonly productService: ProductService) {}

    @Get()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: AdminProductPaginationDto})
    async index(@Query() query: AdminFilterProductDto): Promise<AdminProductPaginationDto> {
        return this.productService.getFilteredProducts(query);
    }

    @Get(':id')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: ProductDto })
    async getProduct(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {

        const product = await this.productService.getProductById(id);

        if(!product)
            throw new NotFoundException('Product not found');

        return product;
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiCreatedResponse({ type: ProductDto })
    async create(@Body() payload: CreateProductDto): Promise<ProductDto> {
        return this.productService.createProduct(payload);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: ProductDto })
    async update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateProductDto): Promise<ProductDto> {
        return this.productService.updateProduct(id, payload);
    }

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiNoContentResponse()
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.productService.removeProduct(id);
    }
}