import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchDto {
    @ApiProperty({ description: 'ID филиала' })
    id: number;

    @ApiProperty({ description: 'Название филиала' })
    name: string;

    @ApiPropertyOptional({ description: 'Описание филиала' })
    description?: string;

    @ApiProperty({ description: 'Адрес филиала' })
    address: string;

    @ApiPropertyOptional({ description: 'Город' })
    city?: string;

    @ApiPropertyOptional({ description: 'Регион' })
    region?: string;

    @ApiPropertyOptional({ description: 'Телефон' })
    phone?: string;

    @ApiProperty({ description: 'Активен ли филиал' })
    isActive: boolean;

    @ApiProperty({ description: 'Дата создания' })
    createdAt: Date;

    @ApiProperty({ description: 'Дата обновления' })
    updatedAt: Date;
}
