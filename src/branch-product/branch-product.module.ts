import { Module } from '@nestjs/common';
import { AuthGrpcClientModule } from 'src/common/auth';
import { BranchProductController } from './controllers/branch-product.controller';
import { BranchProductService } from './branch-product.service';
import { AdminBranchProductsController } from './controllers/admin-branch-product.controller';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [BranchProductController, AdminBranchProductsController],
    providers: [BranchProductService],
})
export class BranchProductModule {}
