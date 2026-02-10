import { ApiProperty } from "@nestjs/swagger";

class PaginationMeta {
    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}

export class PaginationDto {
    @ApiProperty()
    meta: PaginationMeta;
}