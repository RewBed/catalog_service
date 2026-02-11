import { ApiProperty } from "@nestjs/swagger";

export class ImageCategoryDto {
    @ApiProperty({ description: 'ключ изображения' })
    url: string;

    @ApiProperty({ description: 'Тип изображения' })
    type: string;
}