import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Email',
    example: 'moscow@gearo.ru',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({
    description: 'Working hours',
    example: 'Mon-Sat 9:00-20:00',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  workingHours?: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 55.7558,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: 37.6173,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Banner image external id',
    example: 'f6a1c6b6f3d741f4ad3c1a2a',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bannerImage?: string;

  @ApiPropertyOptional({ description: 'Branch active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
