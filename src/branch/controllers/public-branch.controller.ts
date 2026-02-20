import { ApiOkResponse } from "@nestjs/swagger";
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

    @ApiOkResponse({ type: BranchPaginationDto })
    @Get()
    async index(@Query() query: FilterBranchDto): Promise<BranchPaginationDto> {
        return this.branchService.getAll(query);
    }

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
