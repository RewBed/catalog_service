import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchDto {
  @ApiProperty({ description: 'Branch id', example: 5 })
  id: number;

  @ApiProperty({ description: 'Branch name', example: 'Moscow Center Branch' })
  name: string;

  @ApiPropertyOptional({
    description: 'Branch description',
    example: 'Main retail branch in city center',
  })
  description?: string;

  @ApiProperty({ description: 'Branch address', example: 'Tverskaya St, 7' })
  address: string;

  @ApiPropertyOptional({ description: 'City', example: 'Moscow' })
  city?: string;

  @ApiPropertyOptional({ description: 'Region', example: 'Moscow City' })
  region?: string;

  @ApiPropertyOptional({ description: 'Phone', example: '+7 495 555-12-34' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email',
    example: 'moscow@gearo.ru',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Working hours',
    example: 'Mon-Sat 9:00-20:00',
  })
  workingHours?: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 55.7558,
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: 37.6173,
  })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Banner image external id',
    example: 'f6a1c6b6f3d741f4ad3c1a2a',
  })
  bannerImage?: string;
}
