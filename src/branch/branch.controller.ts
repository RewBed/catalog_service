import { Controller, Get } from "@nestjs/common";
import { BranchDto } from "./dto/branch.dto";
import { BranchService } from "./branch.service";
import { ApiOkResponse } from "@nestjs/swagger";

@Controller('branch')
export class BranchController {

    constructor(private readonly branchService: BranchService) {}

    @ApiOkResponse({ type: [BranchDto] })
    @Get()
    async index(): Promise<BranchDto[]> {
        return this.branchService.getAll();
    }
}