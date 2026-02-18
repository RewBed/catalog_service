import { ApiProperty } from "@nestjs/swagger";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ProductDto } from "../product.dto";

export class AdminProductPaginationDto extends PaginationDto {
    @ApiProperty({ type: [ProductDto] })
    items: ProductDto[]
}