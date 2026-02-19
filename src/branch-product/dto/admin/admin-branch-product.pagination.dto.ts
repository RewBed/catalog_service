import { ApiProperty } from "@nestjs/swagger";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { AdminBranchProductDto } from "./admin-branch-product.dto";

export class AdminBranchProductPaginationDto extends PaginationDto {
    @ApiProperty({ type: [AdminBranchProductDto] })
    items: AdminBranchProductDto[];
}
