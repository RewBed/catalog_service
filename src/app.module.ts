import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { BranchModule } from './branch/branch.module';
import { OutboxModule } from './core/outbox/outbox.module';
import { ImageEventsModule } from './image-events/image-events.module';
import { BranchProductModule } from './branch-product/branch-product.module';

@Module({
    imports: [
        ConfigModule, 
        DatabaseModule, 
        HealthModule, 
        LoggerModule, 
        CategoryModule, 
        ProductModule,
        BranchModule,
        BranchProductModule,
        OutboxModule,
        ImageEventsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
