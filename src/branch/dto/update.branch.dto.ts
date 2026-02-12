import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBranchDto {
    @ApiPropertyOptional({ description: 'Branch name' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'Branch description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Branch address' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    address?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    city?: string;

    @ApiPropertyOptional({ description: 'Region' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    region?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiPropertyOptional({ description: 'Branch active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
