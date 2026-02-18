import { ApiProperty } from "@nestjs/swagger";
import { CategoryDto } from "../category.dto";

export class AdminCategoryDto extends CategoryDto {

    @ApiProperty()
    sortOrder: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    deletedAt: Date | null;
}