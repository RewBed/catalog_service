import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProductVariantService } from '../product-variant.service';
import { ProductVariantGroupDto } from '../dto/variant/product-variant-group.dto';
import { ProductVariantPriceDto } from '../dto/variant/product-variant-price.dto';
import { GetProductVariantPriceDto } from '../dto/variant/get-product-variant-price.dto';

@Controller('api/products/:productId/variant-groups')
@ApiTags('Product Variants')
export class ProductVariantController {
    constructor(private readonly productVariantService: ProductVariantService) {}

    @ApiOperation({ summary: 'Get active variant groups for product' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiOkResponse({ type: [ProductVariantGroupDto] })
    @Get()
    async index(@Param('productId', ParseIntPipe) productId: number): Promise<ProductVariantGroupDto[]> {
        return this.productVariantService.getAllPublic(productId);
    }

    @ApiOperation({ summary: 'Calculate final product price by selected option ids' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiOkResponse({ type: ProductVariantPriceDto })
    @Get('price')
    async getPrice(
        @Param('productId', ParseIntPipe) productId: number,
        @Query() query: GetProductVariantPriceDto,
    ): Promise<ProductVariantPriceDto> {
        return this.productVariantService.getPricePublic(productId, query.optionIds);
    }
}
