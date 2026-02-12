import { Module } from '@nestjs/common';
import { AuthGrpcClientModule } from 'src/common/auth';
import { BranchProductController } from './branch-product.controller';
import { BranchProductService } from './branch-product.service';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [BranchProductController],
    providers: [BranchProductService],
})
export class BranchProductModule {}
