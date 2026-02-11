import { ApiProperty } from "@nestjs/swagger";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { FrontProductDto } from "./front.product.dto";

export class FrontProductPaginationDto extends PaginationDto {
    @ApiProperty({ type: [FrontProductDto] })
    items: FrontProductDto[]
}