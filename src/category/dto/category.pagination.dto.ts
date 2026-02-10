import { PaginationDto } from "src/common/dto/pagination.dto";
import { CategoryDto } from "./category.dto";
import { ApiProperty } from "@nestjs/swagger";

export class CategoryPaginationDto extends PaginationDto {

    @ApiProperty({ type: [CategoryDto] })
    items: CategoryDto[]
}