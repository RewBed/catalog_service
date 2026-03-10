import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class GetProductVariantPriceDto {
  @ApiPropertyOptional({
    description:
      'Selected option ids. Can be repeated (?optionIds=1&optionIds=2) or comma-separated (?optionIds=1,2)',
    type: [Number],
    example: [201, 303],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    const source = Array.isArray(value) ? value : String(value).split(',');
    return source
      .flatMap((item) => String(item).split(','))
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  optionIds: number[] = [];
}
