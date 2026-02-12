import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BranchProduct, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { BranchProductDto } from './dto/branch-product.dto';
import { CreateBranchProductDto } from './dto/create.branch-product.dto';
import { UpdateBranchProductDto } from './dto/update.branch-product.dto';

@Injectable()
export class BranchProductService {
    constructor(private readonly prisma: PrismaService) {}

    async getAll(): Promise<BranchProductDto[]> {
        const items = await this.prisma.branchProduct.findMany({
            where: {
                isActive: true,
                branch: { isActive: true },
                productItem: { deletedAt: null },
            },
        });

        return items.map((item) => this.toDto(item));
    }

    async getItem(id: number): Promise<BranchProductDto | null> {
        const item = await this.prisma.branchProduct.findFirst({
            where: {
                id,
                isActive: true,
                branch: { isActive: true },
                productItem: { deletedAt: null },
            },
        });

        if (!item) {
            return null;
        }

        return this.toDto(item);
    }

    async create(payload: CreateBranchProductDto): Promise<BranchProductDto> {
        await this.ensureBranchExists(payload.branchId);
        await this.ensureProductExists(payload.productId);

        try {
            const item = await this.prisma.branchProduct.create({
                data: {
                    productId: payload.productId,
                    branchId: payload.branchId,
                    price: payload.price,
                    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toDto(item);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async update(id: number, payload: UpdateBranchProductDto): Promise<BranchProductDto> {
        await this.ensureBranchProductExists(id);

        try {
            const item = await this.prisma.branchProduct.update({
                where: { id },
                data: {
                    ...(payload.price !== undefined ? { price: payload.price } : {}),
                    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
                    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
                },
            });

            return this.toDto(item);
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async remove(id: number): Promise<void> {
        await this.ensureBranchProductExists(id);

        try {
            await this.prisma.branchProduct.update({
                where: { id },
                data: {
                    isActive: false,
                },
            });
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private toDto(item: BranchProduct): BranchProductDto {
        return {
            id: item.id,
            productId: item.productId,
            branchId: item.branchId,
            price: item.price.toNumber(),
            stock: item.stock,
            isActive: item.isActive,
        };
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

    private async ensureProductExists(id: number): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product ${id} not found`);
        }
    }

    private async ensureBranchProductExists(id: number): Promise<void> {
        const item = await this.prisma.branchProduct.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!item || !item.isActive) {
            throw new NotFoundException(`BranchProduct ${id} not found`);
        }
    }

    private handlePrismaError(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('BranchProduct with this branch and product already exists');
            }

            if (error.code === 'P2003') {
                throw new ConflictException('BranchProduct has invalid relations');
            }
        }

        throw error;
    }
}
