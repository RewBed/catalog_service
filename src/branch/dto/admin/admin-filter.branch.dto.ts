import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { FilterBranchDto } from '../filter.branch.dto';

export class AdminFilterBranchDto extends FilterBranchDto {
    @ApiPropertyOptional({ description: 'Filter by active status' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
    @IsBoolean()
    isActive?: boolean;
}
