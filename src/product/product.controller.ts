import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { FilterFrontProductDto } from "./dto/filter.front.product.dto";
import { FrontProductDto } from "./dto/front.product.dto";
import { FrontProductPaginationDto } from "./dto/front.product.pagination.dto";
import { ProductService } from "./product.service";

@Controller('product')
export class ProductController {

    constructor(private readonly productService: ProductService) {}

    @ApiOkResponse({ type: [FrontProductDto] })
    @Get()
    async index(@Query() query: FilterFrontProductDto): Promise<FrontProductPaginationDto> {
        return this.productService.getFilteredProducts(query);
    }
}