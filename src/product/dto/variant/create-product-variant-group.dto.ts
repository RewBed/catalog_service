import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductVariantGroupDto {
  @ApiProperty({
    description: 'Variant group title, for example Size or Material',
    example: 'Size',
  })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Whether one option from this group must be selected',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ description: 'Sort order', required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'Active status', required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
