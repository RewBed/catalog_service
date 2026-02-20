import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchDto {
    @ApiProperty({ description: 'Branch id' })
    id: number;

    @ApiProperty({ description: 'Branch name' })
    name: string;

    @ApiPropertyOptional({ description: 'Branch description' })
    description?: string;

    @ApiProperty({ description: 'Branch address' })
    address: string;

    @ApiPropertyOptional({ description: 'City' })
    city?: string;

    @ApiPropertyOptional({ description: 'Region' })
    region?: string;

    @ApiPropertyOptional({ description: 'Phone' })
    phone?: string;
}
