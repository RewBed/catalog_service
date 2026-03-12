import { Module } from '@nestjs/common';
import { AuthGrpcClientModule } from 'src/common/auth';
import { AdminCollectionController } from './controllers/admin-collection.controller';
import { PublicCollectionController } from './controllers/public-collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [AuthGrpcClientModule],
  controllers: [PublicCollectionController, AdminCollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
