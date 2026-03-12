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
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateBranchDto } from "../dto/create.branch.dto";
import { UpdateBranchDto } from "../dto/update.branch.dto";
import { GrpcAuthGuard } from "src/common/auth";
import { AdminBranchDto } from "../dto/admin/admin-branch.dto";
import { AdminBranchPaginationDto } from "../dto/admin/admin-branch.pagination.dto";
import { AdminFilterBranchDto } from "../dto/admin/admin-filter.branch.dto";

@Controller('api/admin/branches')
@ApiTags('Admin Branches')
export class AdminBranchController {

    constructor(private readonly branchService: BranchService) {}

    @ApiOperation({ operationId: 'getAdminBranches' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchPaginationDto,
        links: {
            getAdminBranchByIdFromList: {
                operationId: 'getAdminBranchById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Get()
    async index(@Query() query: AdminFilterBranchDto): Promise<AdminBranchPaginationDto> {
        return this.branchService.getAllAdmin(query);
    }

    @ApiOperation({ operationId: 'getAdminBranchById' })
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

    @ApiOperation({ operationId: 'createAdminBranch' })
    @ApiBearerAuth()
    @ApiCreatedResponse({
        type: AdminBranchDto,
        links: {
            getCreatedAdminBranch: {
                operationId: 'getAdminBranchById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            updateCreatedAdminBranch: {
                operationId: 'updateAdminBranch',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            deleteCreatedAdminBranch: {
                operationId: 'deleteAdminBranch',
                parameters: {
                    id: '$response.body#/id',
                },
            },
            restoreCreatedAdminBranch: {
                operationId: 'restoreAdminBranch',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateBranchDto): Promise<AdminBranchDto> {
        return this.branchService.create(payload);
    }

    @ApiOperation({ operationId: 'updateAdminBranch' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchDto,
        links: {
            getUpdatedAdminBranch: {
                operationId: 'getAdminBranchById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateBranchDto,
    ): Promise<AdminBranchDto> {
        return this.branchService.update(id, payload);
    }

    @ApiOperation({ operationId: 'deleteAdminBranch' })
    @ApiBearerAuth()
    @ApiNoContentResponse()
    @UseGuards(GrpcAuthGuard)
    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.branchService.remove(id);
    }

    @ApiOperation({ operationId: 'restoreAdminBranch' })
    @ApiBearerAuth()
    @ApiOkResponse({
        type: AdminBranchDto,
        links: {
            getRestoredAdminBranch: {
                operationId: 'getAdminBranchById',
                parameters: {
                    id: '$response.body#/id',
                },
            },
        },
    })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id/restore')
    async restore(@Param('id', ParseIntPipe) id: number): Promise<AdminBranchDto> {
        return this.branchService.restore(id);
    }
}
