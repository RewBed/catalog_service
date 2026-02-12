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
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { ProductService } from "./product.service";
import { GetProductDto } from "./dto/get.product.dto";
import { GrpcAuthGuard } from "src/common/auth";
import { ProductDto } from "./dto/product.dto";
import { CreateProductDto } from "./dto/create.product.dto";
import { UpdateProductDto } from "./dto/update.product.dto";

@Controller('products')
export class ProductController {

    constructor(private readonly productService: ProductService) {}

    @ApiOkResponse({ type: [FrontProductDto] })
    @Get()
    async index(@Query() query: FilterFrontProductDto): Promise<FrontProductPaginationDto> {
        return this.productService.getFilteredProducts(query);
    }

    @ApiOkResponse({ type: FrontProductDto })
    @Get('product')
    async getProduct(@Query() query: GetProductDto) {

        const branchProduct = await this.productService.getItem(query);

        if(!branchProduct)
            throw new NotFoundException('Product not found');

        return branchProduct;
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: [ProductDto] })
    @UseGuards(GrpcAuthGuard)
    @Get('admin')
    async adminIndex(): Promise<ProductDto[]> {
        return this.productService.getAllProducts();
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: ProductDto })
    @UseGuards(GrpcAuthGuard)
    @Get('admin/:id')
    async adminGetItem(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {
        const product = await this.productService.getProductById(id);

        if (!product) {
            throw new NotFoundException(`Product ${id} not found`);
        }

        return product;
    }

    @ApiBearerAuth()
    @ApiCreatedResponse({ type: ProductDto })
    @UseGuards(GrpcAuthGuard)
    @Post('admin')
    async create(@Body() payload: CreateProductDto): Promise<ProductDto> {
        return this.productService.createProduct(payload);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: ProductDto })
    @UseGuards(GrpcAuthGuard)
    @Patch('admin/:id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateProductDto,
    ): Promise<ProductDto> {
        return this.productService.updateProduct(id, payload);
    }

    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete('admin/:id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.productService.removeProduct(id);
    }
}
