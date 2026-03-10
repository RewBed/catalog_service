import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BranchDto } from './branch.dto';

export class BranchPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [BranchDto],
    example: [
      {
        id: 5,
        name: 'Moscow Center Branch',
        description: 'Main retail branch in city center',
        address: 'Tverskaya St, 7',
        city: 'Moscow',
        region: 'Moscow City',
        phone: '+7 495 555-12-34',
      },
    ],
  })
  items: BranchDto[];
}
