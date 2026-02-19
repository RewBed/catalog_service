import { ApiOkResponse } from '@nestjs/swagger';
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
export class BranchProductController {
    constructor(private readonly branchProductService: BranchProductService) {}

    @ApiOkResponse({ type: BranchProductPaginationDto })
    @Get()
    async index(@Query() query: FilterBranchProductDto): Promise<BranchProductPaginationDto> {
        return this.branchProductService.getAll(query);
    }

    @ApiOkResponse({ type: BranchProductDto })
    @Get('by-slug')
    async getItemBySlug(@Query() query: GetBranchProductBySlugDto): Promise<BranchProductDto> {
        const item = await this.branchProductService.getItemBySlug(query.slug, query.branchId);

        if (!item) {
            throw new NotFoundException(`BranchProduct with slug ${query.slug} not found`);
        }

        return item;
    }

    @ApiOkResponse({ type: BranchProductDto })
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<BranchProductDto> {
        const item = await this.branchProductService.getItem(id);

        if (!item) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }

        return item;
    }
}
