import { Controller, Get, NotFoundException, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { ProductService } from "./product.service";
import { GetProductDto } from "./dto/get.product.dto";
import { GrpcAuthGuard } from "src/common/auth";

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
}
