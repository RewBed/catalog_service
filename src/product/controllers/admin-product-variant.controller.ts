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
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/auth';
import { ProductVariantService } from '../product-variant.service';
import { AdminProductVariantGroupDto } from '../dto/variant/admin-product-variant-group.dto';
import { CreateProductVariantGroupDto } from '../dto/variant/create-product-variant-group.dto';
import { UpdateProductVariantGroupDto } from '../dto/variant/update-product-variant-group.dto';
import { CreateProductVariantOptionDto } from '../dto/variant/create-product-variant-option.dto';
import { UpdateProductVariantOptionDto } from '../dto/variant/update-product-variant-option.dto';
import { AdminProductVariantOptionDto } from '../dto/variant/admin-product-variant-option.dto';
import { AdminFilterProductVariantGroupDto } from '../dto/variant/admin-filter-product-variant-group.dto';

@Controller('api/admin/products/:productId/variant-groups')
@ApiTags('Admin Product Variants')
export class AdminProductVariantsController {
    constructor(private readonly productVariantService: ProductVariantService) {}

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get variant groups for product (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiOkResponse({ type: [AdminProductVariantGroupDto] })
    @UseGuards(GrpcAuthGuard)
    @Get()
    async index(
        @Param('productId', ParseIntPipe) productId: number,
        @Query() query: AdminFilterProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto[]> {
        return this.productVariantService.getAllAdmin(productId, query);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get one variant group (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiOkResponse({ type: AdminProductVariantGroupDto })
    @UseGuards(GrpcAuthGuard)
    @Get(':groupId')
    async getGroup(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ): Promise<AdminProductVariantGroupDto> {
        const group = await this.productVariantService.getGroupAdmin(productId, groupId);

        if (!group) {
            throw new NotFoundException(`Product variant group ${groupId} not found`);
        }

        return group;
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create variant group for product (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiCreatedResponse({ type: AdminProductVariantGroupDto })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async createGroup(
        @Param('productId', ParseIntPipe) productId: number,
        @Body() payload: CreateProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto> {
        return this.productVariantService.createGroup(productId, payload);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update variant group (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiOkResponse({ type: AdminProductVariantGroupDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':groupId')
    async updateGroup(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Body() payload: UpdateProductVariantGroupDto,
    ): Promise<AdminProductVariantGroupDto> {
        return this.productVariantService.updateGroup(productId, groupId, payload);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Soft delete variant group (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':groupId')
    @HttpCode(204)
    async removeGroup(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ): Promise<void> {
        return this.productVariantService.removeGroup(productId, groupId);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Restore variant group (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiOkResponse({ type: AdminProductVariantGroupDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':groupId/restore')
    async restoreGroup(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ): Promise<AdminProductVariantGroupDto> {
        return this.productVariantService.restoreGroup(productId, groupId);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create variant option in group (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiCreatedResponse({ type: AdminProductVariantOptionDto })
    @UseGuards(GrpcAuthGuard)
    @Post(':groupId/options')
    async createOption(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Body() payload: CreateProductVariantOptionDto,
    ): Promise<AdminProductVariantOptionDto> {
        return this.productVariantService.createOption(productId, groupId, payload);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update variant option (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiParam({ name: 'optionId', type: Number })
    @ApiOkResponse({ type: AdminProductVariantOptionDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':groupId/options/:optionId')
    async updateOption(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('optionId', ParseIntPipe) optionId: number,
        @Body() payload: UpdateProductVariantOptionDto,
    ): Promise<AdminProductVariantOptionDto> {
        return this.productVariantService.updateOption(productId, groupId, optionId, payload);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Soft delete variant option (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiParam({ name: 'optionId', type: Number })
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':groupId/options/:optionId')
    @HttpCode(204)
    async removeOption(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('optionId', ParseIntPipe) optionId: number,
    ): Promise<void> {
        return this.productVariantService.removeOption(productId, groupId, optionId);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Restore variant option (admin)' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiParam({ name: 'groupId', type: Number })
    @ApiParam({ name: 'optionId', type: Number })
    @ApiOkResponse({ type: AdminProductVariantOptionDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':groupId/options/:optionId/restore')
    async restoreOption(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('optionId', ParseIntPipe) optionId: number,
    ): Promise<AdminProductVariantOptionDto> {
        return this.productVariantService.restoreOption(productId, groupId, optionId);
    }
}
