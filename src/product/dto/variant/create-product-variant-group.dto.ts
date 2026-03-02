import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductVariantGroupDto {
    @ApiProperty({ description: 'Variant group title, for example Size or Material' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiProperty({ description: 'Whether one option from this group must be selected', required: false })
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @ApiProperty({ description: 'Sort order', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiProperty({ description: 'Active status', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
