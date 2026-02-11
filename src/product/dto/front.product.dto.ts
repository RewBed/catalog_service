import { ApiProperty } from '@nestjs/swagger';
import { ImageProductDto } from './image.product.dto';

export class FrontProductDto {
    @ApiProperty({ description: 'ID товарной позиции в филиале' })
    id: number;

    @ApiProperty({ description: 'ID глобального товара' })
    productId: number;

    @ApiProperty({ description: 'Название товара' })
    name: string;

    @ApiProperty({ description: 'Полное название товара' })
    fullName?: string;

    @ApiProperty({ description: 'Slug товара' })
    slug: string;

    @ApiProperty({ description: 'Описание товара' })
    description?: string;

    @ApiProperty({ description: 'Цена' })
    price: number;

    @ApiProperty({ description: 'Количество на складе' })
    stock: number;

    @ApiProperty( { type: [ImageProductDto], description: 'Список изрбражений' } )
    images: ImageProductDto[] = []
}
