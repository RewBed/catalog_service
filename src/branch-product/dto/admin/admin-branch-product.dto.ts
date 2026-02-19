import { ApiProperty } from "@nestjs/swagger";

export class AdminBranchProductDto {
    @ApiProperty({ description: 'Branch product id' })
    id: number;

    @ApiProperty({ description: 'Product id' })
    productId: number;

    @ApiProperty({ description: 'Branch id' })
    branchId: number;

    @ApiProperty({ description: 'Price in branch' })
    price: number;

    @ApiProperty({ description: 'Stock in branch' })
    stock: number;

    @ApiProperty({ description: 'Active status' })
    isActive: boolean;

    @ApiProperty({ description: 'Created at', type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at', type: String, format: 'date-time' })
    updatedAt: Date;
}
