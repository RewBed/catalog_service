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
} from "@nestjs/common";
import { BranchDto } from "./dto/branch.dto";
import { BranchService } from "./branch.service";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from "@nestjs/swagger";
import { CreateBranchDto } from "./dto/create.branch.dto";
import { UpdateBranchDto } from "./dto/update.branch.dto";
import { GrpcAuthGuard } from "src/common/auth";

@Controller('branches')
export class BranchController {

    constructor(private readonly branchService: BranchService) {}

    @ApiOkResponse({ type: [BranchDto] })
    @Get()
    async index(): Promise<BranchDto[]> {
        return this.branchService.getAll();
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

    @ApiBearerAuth()
    @ApiCreatedResponse({ type: BranchDto })
    @UseGuards(GrpcAuthGuard)
    @Post()
    async create(@Body() payload: CreateBranchDto): Promise<BranchDto> {
        return this.branchService.create(payload);
    }

    @ApiBearerAuth()
    @ApiOkResponse({ type: BranchDto })
    @UseGuards(GrpcAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateBranchDto,
    ): Promise<BranchDto> {
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
