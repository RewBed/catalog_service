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
        categoryName: 'Dining Tables',
        sku: 'TBL-OAK-120',
        article: 'TBL-OAK-120',
        description: 'Solid oak dining table, 120 cm width',
        shortDescription: 'Compact oak dining table for 4 people',
        technicalDescription: 'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
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
