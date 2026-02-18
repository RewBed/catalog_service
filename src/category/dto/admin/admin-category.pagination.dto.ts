import { PaginationDto } from "src/common/dto/pagination.dto";
import { ApiProperty } from "@nestjs/swagger";
import { AdminCategoryDto } from "./admin-category.dto";

export class AdminCategoryPaginationDto extends PaginationDto {

    @ApiProperty({ type: [AdminCategoryDto] })
    items: AdminCategoryDto[]
}