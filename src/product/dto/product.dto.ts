import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageProductDto } from './image.product.dto';

export class ProductDto {
    @ApiProperty({ description: 'Product id' })
    id: number;

    @ApiProperty({ description: 'Product name' })
    name: string;

    @ApiPropertyOptional({ description: 'Full product name' })
    fullName?: string;

    @ApiProperty({ description: 'Product slug' })
    slug: string;

    @ApiPropertyOptional({ description: 'Product description' })
    description?: string;

    @ApiProperty({ description: 'Product price' })
    price: number;

    @ApiProperty({ description: 'Category id' })
    categoryId: number;

    @ApiProperty({ description: 'Sorting priority' })
    sortOrder: number;

    @ApiProperty({ type: [ImageProductDto] })
    images: ImageProductDto[] = [];
}
