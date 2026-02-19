import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageProductDto } from 'src/product/dto/image.product.dto';

export class BranchProductDto {
    @ApiProperty({ description: 'Branch product id' })
    id: number;

    @ApiProperty({ description: 'Branch id' })
    branchId: number;

    @ApiProperty({ description: 'Price in branch' })
    price: number;

    @ApiProperty({ description: 'Stock in branch' })
    stock: number;

    @ApiProperty({ description: 'Product name' })
    name: string;

    @ApiPropertyOptional({ description: 'Product description' })
    description?: string;

    @ApiProperty({ description: 'Product slug' })
    slug: string;

    @ApiProperty({ type: [ImageProductDto] })
    images: ImageProductDto[] = [];
}
