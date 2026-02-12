import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBranchProductDto {
    @ApiPropertyOptional({ description: 'Price in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price?: number;

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
