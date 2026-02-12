import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { BranchDto } from "./dto/branch.dto";
import { Branch, Prisma } from "generated/prisma/client";
import { CreateBranchDto } from "./dto/create.branch.dto";
import { UpdateBranchDto } from "./dto/update.branch.dto";

@Injectable()
export class BranchService {

    constructor(private readonly prisma: PrismaService) {}

    async getAll(): Promise<BranchDto[]> {
        const branches = await this.prisma.branch.findMany({
            where: {
                isActive: true,
            },
        });
        return branches.map(this.toDo);
    }

    async getItem(id: number): Promise<BranchDto | null> {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });

        if (!branch || !branch.isActive) {
            return null;
        }

        return this.toDo(branch);
    }

    async create(payload: CreateBranchDto): Promise<BranchDto> {
        try {
            const branch = await this.prisma.branch.create({
                data: {
                    name: payload.name,
                    address: payload.address,
                    ...(payload.description !== undefined ? { description: payload.description } : {}),
                    ...(payload.city !== undefined ? { city: payload.city } : {}),
                    ...(payload.region !== undefined ? { region: payload.region } : {}),
                    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toDo(branch);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async update(id: number, payload: UpdateBranchDto): Promise<BranchDto> {
        await this.ensureBranchExists(id);

        try {
            const branch = await this.prisma.branch.update({
                where: { id },
                data: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.description !== undefined ? { description: payload.description } : {}),
                    ...(payload.address !== undefined ? { address: payload.address } : {}),
                    ...(payload.city !== undefined ? { city: payload.city } : {}),
                    ...(payload.region !== undefined ? { region: payload.region } : {}),
                    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toDo(branch);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async remove(id: number): Promise<void> {
        await this.ensureBranchExists(id);

        try {
            await this.prisma.branch.update({
                where: { id },
                data: {
                    isActive: false,
                },
            });
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private toDo(branch: Branch): BranchDto {
        return {
            id: branch.id,
            name: branch.name,
            description: branch.description ?? '',
            address: branch.address ?? '',
            city: branch.city ?? '',
            region: branch.region ?? '',
            phone: branch.phone ?? '',
            isActive: branch.isActive,
        }
    }

    private async ensureBranchExists(id: number): Promise<void> {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!branch || !branch.isActive) {
            throw new NotFoundException(`Branch ${id} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                throw new ConflictException('Branch cannot be deleted because it has related entities');
            }
        }

        throw error;
    }
}
