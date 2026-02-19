import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class GetBranchProductBySlugDto {
    @ApiProperty({ description: 'Product slug' })
    @IsString()
    slug: string;

    @ApiProperty({ description: 'Branch id' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    branchId: number;
}
