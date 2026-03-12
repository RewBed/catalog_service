import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BranchProductService } from '../branch-product.service';
import { BranchProductDto } from '../dto/branch-product.dto';
import { BranchProductPaginationDto } from '../dto/branch-product.pagination.dto';
import { FilterBranchProductDto } from '../dto/filter.branch-product.dto';
import { GetBranchProductBySlugDto } from '../dto/get-branch-product-by-slug.dto';
import {
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
} from '@nestjs/common';

@Controller('/api/branch-products')
@ApiTags('Branch Products')
export class BranchProductController {
    constructor(private readonly branchProductService: BranchProductService) {}

    @ApiOperation({ operationId: 'getPublicBranchProducts' })
    @ApiOkResponse({
        type: BranchProductPaginationDto,
        links: {
            getBranchProductByIdFromList: {
                operationId: 'getPublicBranchProductById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
            getBranchProductBySlugFromList: {
                operationId: 'getPublicBranchProductBySlug',
                parameters: {
                    slug: '$response.body#/items/0/slug',
                    branchId: '$response.body#/items/0/branchId',
                },
            },
            getProductVariantGroupsFromBranchProductList: {
                operationId: 'getPublicProductVariantGroups',
                parameters: {
                    productId: '$response.body#/items/0/productId',
                },
            },
        },
    })
    @Get()
    async index(@Query() query: FilterBranchProductDto): Promise<BranchProductPaginationDto> {
        return this.branchProductService.getAll(query);
    }

    @ApiOperation({ operationId: 'getPublicBranchProductBySlug' })
    @ApiOkResponse({
        type: BranchProductDto,
        links: {
            getBranchProductByIdFromSlug: {
                operationId: 'getPublicBranchProductById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            getProductVariantGroupsFromBranchProductSlug: {
                operationId: 'getPublicProductVariantGroups',
                parameters: {
                    productId: '$response.body#/productId',
                },
            },
        },
    })
    @Get('by-slug')
    async getItemBySlug(@Query() query: GetBranchProductBySlugDto): Promise<BranchProductDto> {
        const item = await this.branchProductService.getItemBySlug(query.slug, query.branchId);

        if (!item) {
            throw new NotFoundException(`BranchProduct with slug ${query.slug} not found`);
        }

        return item;
    }

    @ApiOperation({ operationId: 'getPublicBranchProductById' })
    @ApiOkResponse({
        type: BranchProductDto,
        links: {
            getBranchProductBySlugFromId: {
                operationId: 'getPublicBranchProductBySlug',
                parameters: {
                    slug: '$response.body#/slug',
                    branchId: '$response.body#/branchId',
                },
            },
            getProductVariantGroupsFromBranchProductId: {
                operationId: 'getPublicProductVariantGroups',
                parameters: {
                    productId: '$response.body#/productId',
                },
            },
        },
    })
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<BranchProductDto> {
        const item = await this.branchProductService.getItem(id);

        if (!item) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }

        return item;
    }
}
