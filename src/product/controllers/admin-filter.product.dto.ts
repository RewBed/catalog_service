import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdminFilterProductDto {
    @ApiPropertyOptional({ description: 'Фильтр по имени товара (частичное совпадение)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Минимальная цена' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional({ description: 'Максимальная цена' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxPrice?: number;

    @ApiPropertyOptional({ description: 'Фильтр по категории' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

    // Пагинация
    @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 25 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 25;

    @ApiPropertyOptional({ description: 'Показать удаленные товары' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
    @IsBoolean()
    isDeleted: boolean = false;
}
