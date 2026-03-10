import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AdminBranchProductDto } from './admin-branch-product.dto';

export class AdminBranchProductPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [AdminBranchProductDto],
    example: [
      {
        id: 7001,
        productId: 101,
        branchId: 5,
        price: 25990,
        stock: 20,
        isActive: true,
        createdAt: '2026-03-10T08:45:17.000Z',
        updatedAt: '2026-03-10T10:01:44.000Z',
      },
    ],
  })
  items: AdminBranchProductDto[];
}
