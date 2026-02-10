import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';

export class FilterCategoriesDto {
    @ApiPropertyOptional({ description: 'Фильтр по имени категории' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'Фильтр по описанию категории' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Фильтр по ID родительской категории' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    parentId?: number;

    // Пагинация
    @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 25;
}
