import { Module } from '@nestjs/common';
import { ImageEventsController } from './image-events.controller';
import { ImageEventsMetrics } from './image-events.metrics';
import { ImageEventsService } from './image-events.service';
import { ImageUpdatedConsumerService } from './image-updated-consumer.service';

@Module({
    controllers: [ImageEventsController],
    providers: [ImageEventsService, ImageEventsMetrics, ImageUpdatedConsumerService],
})
export class ImageEventsModule {}
