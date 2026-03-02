import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantOptionDto {
    @ApiProperty({ description: 'Variant option id' })
    id: number;

    @ApiProperty({ description: 'Variant option title' })
    name: string;

    @ApiProperty({ description: 'Price delta added to base product price' })
    priceDelta: number;

    @ApiProperty({ description: 'Sort order' })
    sortOrder: number;
}
