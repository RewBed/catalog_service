import { ApiProperty } from '@nestjs/swagger';
import { CategoryDto } from '../category.dto';

export class AdminCategoryDto extends CategoryDto {
  @ApiProperty({ example: 120 })
  sortOrder: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-10T08:15:20.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-10T09:40:03.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  deletedAt: Date | null;
}
