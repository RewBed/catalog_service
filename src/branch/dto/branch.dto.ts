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
}
