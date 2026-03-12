import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BranchService } from "../branch.service";
import { BranchDto } from "../dto/branch.dto";
import { BranchPaginationDto } from "../dto/branch.pagination.dto";
import { FilterBranchDto } from "../dto/filter.branch.dto";
import {
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
} from "@nestjs/common";

@Controller('api/branches')
export class PublicBranchController {

    constructor(private readonly branchService: BranchService) {}

    @ApiOperation({ operationId: 'getPublicBranches' })
    @ApiOkResponse({
        type: BranchPaginationDto,
        links: {
            getBranchByIdFromList: {
                operationId: 'getPublicBranchById',
                parameters: {
                    id: '$response.body#/items/0/id',
                },
            },
        },
    })
    @Get()
    async index(@Query() query: FilterBranchDto): Promise<BranchPaginationDto> {
        return this.branchService.getAll(query);
    }

    @ApiOperation({ operationId: 'getPublicBranchById' })
    @ApiOkResponse({ type: BranchDto })
    @Get(':id')
    async getItem(@Param('id', ParseIntPipe) id: number): Promise<BranchDto> {
        const branch = await this.branchService.getItem(id);

        if (!branch) {
            throw new NotFoundException(`Branch ${id} not found`);
        }

        return branch;
    }
}
