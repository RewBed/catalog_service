import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class GetBranchProductBySlugDto {
  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Branch id', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId: number;
}
