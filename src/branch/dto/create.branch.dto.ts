import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
    @ApiProperty({ description: 'Branch name' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ description: 'Branch description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Branch address' })
    @IsString()
    @MaxLength(250)
    address: string;

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
