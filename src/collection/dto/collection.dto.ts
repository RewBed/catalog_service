import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectionDto {
  @ApiProperty({ description: 'Collection id', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Collection title',
    example: 'Main Banner Collection',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Products displayed in homepage banner',
  })
  description?: string;
}
