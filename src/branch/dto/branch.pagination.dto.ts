import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BranchDto } from './branch.dto';

export class BranchPaginationDto extends PaginationDto {
    @ApiProperty({ type: [BranchDto] })
    items: BranchDto[];
}
