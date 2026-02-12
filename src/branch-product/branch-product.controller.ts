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
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/auth';
import { BranchProductService } from './branch-product.service';
import { BranchProductDto } from './dto/branch-product.dto';
import { CreateBranchProductDto } from './dto/create.branch-product.dto';
import { UpdateBranchProductDto } from './dto/update.branch-product.dto';

@Controller('branch-products')
export class BranchProductController {
    constructor(private readonly branchProductService: BranchProductService) {}

    @ApiOkResponse({ type: [BranchProductDto] })
    @Get()
    async index(): Promise<BranchProductDto[]> {
        return this.branchProductService.getAll();
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
}
