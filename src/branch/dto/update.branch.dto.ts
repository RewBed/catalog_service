import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBranchDto {
  @ApiPropertyOptional({
    description: 'Branch name',
    example: 'Moscow Center Branch Renovated',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Branch description',
    example: 'Updated retail branch with expanded pickup area',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Branch address',
    example: 'Tverskaya St, 9',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Moscow' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @ApiPropertyOptional({ description: 'Region', example: 'Moscow City' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  region?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+7 495 555-98-76',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Branch active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
