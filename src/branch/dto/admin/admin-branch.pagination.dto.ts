import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AdminBranchDto } from './admin-branch.dto';

export class AdminBranchPaginationDto extends PaginationDto {
    @ApiProperty({ type: [AdminBranchDto] })
    items: AdminBranchDto[];
}
