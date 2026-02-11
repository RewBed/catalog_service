import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { BranchDto } from "./dto/branch.dto";
import { Branch } from "generated/prisma/client";

@Injectable()
export class BranchService {

    constructor(private readonly prisma: PrismaService) {}

    async getAll(): Promise<BranchDto[]> {
        const branches = await this.prisma.branch.findMany();
        return branches.map(this.toDo);
    }

    private toDo(branch: Branch): BranchDto {
        return {
            id: branch.id,
            name: branch.name,
            description: branch.description ?? '',
            address: branch.address ?? '',
            city: branch.city ?? '',
            region: branch.region ?? '',
            phone: branch.phone ?? ''
        }
    }
}