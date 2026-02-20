import { ApiProperty } from '@nestjs/swagger';
import { BranchDto } from '../branch.dto';

export class AdminBranchDto extends BranchDto {
    @ApiProperty({ description: 'Branch active status' })
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
