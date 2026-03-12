import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AdminBranchDto } from './admin-branch.dto';

export class AdminBranchPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [AdminBranchDto],
    example: [
      {
        id: 5,
        name: 'Moscow Center Branch',
        description: 'Main retail branch in city center',
        address: 'Tverskaya St, 7',
        city: 'Moscow',
        region: 'Moscow City',
        phone: '+7 495 555-12-34',
        email: 'moscow@gearo.ru',
        workingHours: 'Mon-Sat 9:00-20:00',
        latitude: 55.7558,
        longitude: 37.6173,
        bannerImage: 'f6a1c6b6f3d741f4ad3c1a2a',
        isActive: true,
        createdAt: '2026-03-10T08:21:11.000Z',
        updatedAt: '2026-03-10T10:05:30.000Z',
      },
    ],
  })
  items: AdminBranchDto[];
}
