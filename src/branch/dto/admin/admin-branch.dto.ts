import { ApiProperty } from '@nestjs/swagger';
import { BranchDto } from '../branch.dto';

export class AdminBranchDto extends BranchDto {
  @ApiProperty({ description: 'Branch active status', example: true })
  isActive: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-10T08:21:11.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-10T10:05:30.000Z',
  })
  updatedAt: Date;
}
