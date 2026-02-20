import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { BranchDto } from "./dto/branch.dto";
import { Branch, Prisma } from "generated/prisma/client";
import { CreateBranchDto } from "./dto/create.branch.dto";
import { UpdateBranchDto } from "./dto/update.branch.dto";
import { AdminBranchDto } from "./dto/admin/admin-branch.dto";
import { FilterBranchDto } from "./dto/filter.branch.dto";
import { BranchPaginationDto } from "./dto/branch.pagination.dto";
import { AdminFilterBranchDto } from "./dto/admin/admin-filter.branch.dto";
import { AdminBranchPaginationDto } from "./dto/admin/admin-branch.pagination.dto";

@Injectable()
export class BranchService {

    constructor(private readonly prisma: PrismaService) {}

    async getAll(filter: FilterBranchDto): Promise<BranchPaginationDto> {
        const { page, limit } = filter;

        const where: Prisma.BranchWhereInput = {
            isActive: true,
        };

        const total = await this.prisma.branch.count({ where });

        const branches = await this.prisma.branch.findMany({
            where,
            orderBy: { id: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: branches.map(this.toDto),
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    async getItem(id: number): Promise<BranchDto | null> {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });

        if (!branch || !branch.isActive) {
            return null;
        }

        return this.toDto(branch);
    }

    async getAllAdmin(filter: AdminFilterBranchDto): Promise<AdminBranchPaginationDto> {
        const { page, limit, isActive } = filter;

        const where: Prisma.BranchWhereInput = {};

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        const total = await this.prisma.branch.count({ where });

        const branches = await this.prisma.branch.findMany({
            where,
            orderBy: { id: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: branches.map(this.toAdminDto),
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    async getItemAdmin(id: number): Promise<AdminBranchDto | null> {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });

        if (!branch) {
            return null;
        }

        return this.toAdminDto(branch);
    }

    async create(payload: CreateBranchDto): Promise<AdminBranchDto> {
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

            return this.toAdminDto(branch);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async update(id: number, payload: UpdateBranchDto): Promise<AdminBranchDto> {
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

            return this.toAdminDto(branch);
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

    async restore(id: number): Promise<AdminBranchDto> {
        await this.ensureBranchExistsAny(id);

        try {
            const branch = await this.prisma.branch.update({
                where: { id },
                data: {
                    isActive: true,
                },
            });

            return this.toAdminDto(branch);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private toDto(branch: Branch): BranchDto {
        return {
            id: branch.id,
            name: branch.name,
            description: branch.description ?? '',
            address: branch.address ?? '',
            city: branch.city ?? '',
            region: branch.region ?? '',
            phone: branch.phone ?? '',
        }
    }

    private toAdminDto(branch: Branch): AdminBranchDto {
        return {
            id: branch.id,
            name: branch.name,
            description: branch.description ?? '',
            address: branch.address ?? '',
            city: branch.city ?? '',
            region: branch.region ?? '',
            phone: branch.phone ?? '',
            isActive: branch.isActive,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
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

    private async ensureBranchExistsAny(id: number): Promise<void> {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!branch) {
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
