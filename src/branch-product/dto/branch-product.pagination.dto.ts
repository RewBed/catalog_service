import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BranchProductDto } from './branch-product.dto';

export class BranchProductPaginationDto extends PaginationDto {
    @ApiProperty({ type: [BranchProductDto] })
    items: BranchProductDto[];
}
