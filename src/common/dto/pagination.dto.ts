import { ApiProperty } from '@nestjs/swagger';

class PaginationMeta {
  @ApiProperty({ description: 'Total items count', example: 124 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 25 })
  limit: number;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 124,
      page: 1,
      limit: 25,
    },
  })
  meta: PaginationMeta;
}
