import { Module } from '@nestjs/common';
import { ImageEventsController } from './image-events.controller';
import { ImageEventsService } from './image-events.service';

@Module({
    controllers: [ImageEventsController],
    providers: [ImageEventsService],
})
export class ImageEventsModule {}
