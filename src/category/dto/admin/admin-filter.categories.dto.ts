import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterCategoriesDto } from '../filter.categories.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminFilterCategoriesDto extends FilterCategoriesDto {
    @ApiPropertyOptional({ description: 'Показать удаленные товары' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
    @IsBoolean()
    isDeleted: boolean = false;
}
