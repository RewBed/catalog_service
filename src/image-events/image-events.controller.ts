import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ImageEventsService, ImageUploadedEvent } from './image-events.service';

@Controller()
export class ImageEventsController {
    private readonly logger = new Logger(ImageEventsController.name);

    constructor(private readonly imageEventsService: ImageEventsService) {}

    @EventPattern(process.env.KAFKA_TOPIC_IMAGE_UPLOADED || 'image.uploaded')
    async onImageUploaded(@Payload() payload: unknown): Promise<void> {
        const event = this.parsePayload(payload);

        if (!event) {
            this.logger.warn('Пропущено некорректное сообщение image.uploaded');
            return;
        }

        if (event.eventType !== 'image.uploaded') {
            return;
        }

        await this.imageEventsService.handleImageUploaded(event);
    }

    private parsePayload(payload: unknown): ImageUploadedEvent | null {
        // Для Kafka в Nest payload может прийти как { value }, строка, Buffer или объект.
        const maybeValue = (payload as { value?: unknown })?.value;
        const source = maybeValue ?? payload;

        if (Buffer.isBuffer(source)) {
            return this.parseJson(source.toString('utf-8'));
        }

        if (typeof source === 'string') {
            return this.parseJson(source);
        }

        if (!source || typeof source !== 'object') {
            return null;
        }

        const event = source as Partial<ImageUploadedEvent>;
        if (!event.data || typeof event.data !== 'object') {
            return null;
        }

        return event as ImageUploadedEvent;
    }

    private parseJson(value: string): ImageUploadedEvent | null {
        try {
            const parsed = JSON.parse(value) as Partial<ImageUploadedEvent>;
            if (!parsed.data || typeof parsed.data !== 'object') {
                return null;
            }

            return parsed as ImageUploadedEvent;
        } catch {
            return null;
        }
    }
}
