import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { ProductService } from "./product.service";
import { GrpcAuthGuard } from "src/common/auth";
import { ProductDto } from "./dto/product.dto";
import { CreateProductDto } from "./dto/create.product.dto";
import { UpdateProductDto } from "./dto/update.product.dto";
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

@Controller('products')
export class ProductController {

    constructor(private readonly productService: ProductService) {}

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: [FrontProductPaginationDto] })
    @Get('admin/products')
    async index(@Query() query: FilterFrontProductDto): Promise<FrontProductPaginationDto> {
        return this.productService.getFilteredProducts(query);
    }

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: ProductDto })
    @Get('admin/products/product/:id')
    async getProduct(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {

        const product = await this.productService.getProductById(id);

        if(!product)
            throw new NotFoundException('Product not found');

        return product;
    }

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiCreatedResponse({ type: ProductDto })
    @Post('admin/products/product')
    async create(@Body() payload: CreateProductDto): Promise<ProductDto> {
        return this.productService.createProduct(payload);
    }

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiOkResponse({ type: ProductDto })
    @Patch('admin/products/product/:id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateProductDto): Promise<ProductDto> {
        return this.productService.updateProduct(id, payload);
    }

    @ApiBearerAuth()
    @UseGuards(GrpcAuthGuard)
    @ApiNoContentResponse()
    @Delete('admin/products/product/:id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.productService.removeProduct(id);
    }
}
