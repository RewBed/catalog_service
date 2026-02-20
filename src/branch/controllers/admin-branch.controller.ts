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
import { BranchService } from "../branch.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { CreateBranchDto } from "../dto/create.branch.dto";
import { UpdateBranchDto } from "../dto/update.branch.dto";
import { GrpcAuthGuard } from "src/common/auth";
import { AdminBranchDto } from "../dto/admin/admin-branch.dto";
import { AdminBranchPaginationDto } from "../dto/admin/admin-branch.pagination.dto";
import { AdminFilterBranchDto } from "../dto/admin/admin-filter.branch.dto";

@Controller('api/admin/branches')
export class AdminBranchController {

    constructor(private readonly branchService: BranchService) {}

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchPaginationDto })
    @UseGuards(GrpcAuthGuard)
    @Get()
    async index(@Query() query: AdminFilterBranchDto): Promise<AdminBranchPaginationDto> {
        return this.branchService.getAllAdmin(query);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchDto })
    @UseGuards(GrpcAuthGuard)
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchDto> {
        const branch = await this.branchService.getItemAdmin(id);

        if (!branch) {
            throw new NotFoundException(`Branch ${id} not found`);
        }

        return branch;
    }

    @ApiBearerAuth()
    @ApiCreatedResponse({ type: AdminBranchDto })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateBranchDto): Promise<AdminBranchDto> {
        return this.branchService.create(payload);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: AdminBranchDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateBranchDto,
    ): Promise<AdminBranchDto> {
        return this.branchService.update(id, payload);
    }

    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.branchService.remove(id);
    }
}
