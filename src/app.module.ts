import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';

@Module({
    imports: [
        ConfigModule, 
        DatabaseModule, 
        HealthModule, 
        LoggerModule, 
        CategoryModule, 
        ProductModule
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
