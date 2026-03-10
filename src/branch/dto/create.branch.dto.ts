import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name', example: 'Moscow Center Branch' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Branch description',
    example: 'Main retail branch in city center',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Branch address', example: 'Tverskaya St, 7' })
  @IsString()
  @MaxLength(250)
  address: string;

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
    example: '+7 495 555-12-34',
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
