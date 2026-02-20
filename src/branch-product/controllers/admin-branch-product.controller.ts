import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { BranchProductService } from "../branch-product.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
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

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchProductPaginationDto })
    @UseGuards(GrpcAuthGuard)
    @Get()
    async index(@Query() query: AdminFilterBranchProductDto): Promise<AdminBranchProductPaginationDto> {
        return this.branchProductService.getAllAdmin(query);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchProductDto })
    @UseGuards(GrpcAuthGuard)
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchProductDto> {
        const item = await this.branchProductService.getItemAdmin(id);

        if (!item) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }

        return item;
    }

    @ApiBearerAuth()
    @ApiCreatedResponse({ type: BranchProductDto })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateBranchProductDto): Promise<BranchProductDto> {
        return this.branchProductService.create(payload);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: BranchProductDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateBranchProductDto,
    ): Promise<BranchProductDto> {
        return this.branchProductService.update(id, payload);
    }

    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.branchProductService.remove(id);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchProductDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id/restore')
    async restore(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchProductDto> {
        return this.branchProductService.restore(id);
    }
}
