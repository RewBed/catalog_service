import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateBranchProductDto {
    @ApiProperty({ description: 'Product id' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    productId: number;

    @ApiProperty({ description: 'Branch id' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    branchId: number;

    @ApiProperty({ description: 'Price in branch' })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ description: 'Stock in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ description: 'Active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
