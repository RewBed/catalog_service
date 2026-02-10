import { ApiProperty } from "@nestjs/swagger";

export class CategoryDto {

    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    fullName?: string

    @ApiProperty()
    slug: string

    @ApiProperty()
    description?: string;

    @ApiProperty()
    parentId?: number = 0;
}