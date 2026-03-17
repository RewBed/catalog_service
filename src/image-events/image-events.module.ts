import { Module } from '@nestjs/common';
import { ImageEventBindingsService } from './image-event-bindings.service';
import { ImageEventsMetrics } from './image-events.metrics';
import { ImageEventsService } from './image-events.service';
import { ImageUpdatedConsumerService } from './image-updated-consumer.service';

@Module({
    controllers: [],
    providers: [
        ImageEventBindingsService,
        ImageEventsService,
        ImageEventsMetrics,
        ImageUpdatedConsumerService,
    ],
})
export class ImageEventsModule {}
