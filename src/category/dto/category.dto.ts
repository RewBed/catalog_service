import { ApiProperty } from "@nestjs/swagger";
import { ImageCategoryDto } from "./image.category.dto";

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

    @ApiProperty({ type: [ImageCategoryDto] })
    images: ImageCategoryDto[] = []
}