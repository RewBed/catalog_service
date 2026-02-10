import { PaginationDto } from "src/common/dto/pagination.dto";
import { HealthDto } from "./health.dto";
import { ApiProperty } from "@nestjs/swagger";

export class HealthPaginationDto extends PaginationDto {
    @ApiProperty({ type: [HealthDto] })
    items: HealthDto[];
}