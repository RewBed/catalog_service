import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGrpcClientModule } from 'src/common/auth';
import { AdminProductController } from './controllers/admin-product.controller';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [AdminProductController],
    providers: [ProductService],
})
export class ProductModule {}
