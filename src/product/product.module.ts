import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGrpcClientModule } from 'src/common/auth';
import { AdminProductController } from './controllers/admin-product.controller';
import { ProductVariantService } from './product-variant.service';
import { AdminProductVariantsController } from './controllers/admin-product-variant.controller';
import { ProductVariantController } from './controllers/product-variant.controller';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [AdminProductController, AdminProductVariantsController, ProductVariantController],
    providers: [ProductService, ProductVariantService],
})
export class ProductModule {}
