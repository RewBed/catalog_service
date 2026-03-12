import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
