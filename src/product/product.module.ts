import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { AuthGrpcClientModule } from 'src/common/auth';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [ProductController],
    providers: [ProductService],
})
export class ProductModule {}
