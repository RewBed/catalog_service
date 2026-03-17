import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { ImageEventBindingsService } from './image-event-bindings.service';
import { ImageEventsMetrics } from './image-events.metrics';
import {
    ImageDeletedEvent,
    ImageEventsService,
    ImageUpdatedProcessResult,
    ImageUploadedEvent,
} from './image-events.service';

type ProcessResult = ImageUpdatedProcessResult & {
    sourceTopic?: string;
};

type EventEnvelope = {
    eventType?: unknown;
    eventId?: unknown;
    data?: {
        externalId?: unknown;
    };
};

@Injectable()
export class ImageUpdatedConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ImageUpdatedConsumerService.name);
    private readonly kafkaEnabled: boolean;
    private readonly topics: string[];
    private readonly dlqTopic: string;
    private readonly maxRetries: number;
    private readonly retryBaseMs: number;

    private consumer: Consumer | null = null;
    private producer: Producer | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly bindingsService: ImageEventBindingsService,
        private readonly imageEventsService: ImageEventsService,
        private readonly metrics: ImageEventsMetrics,
    ) {
        this.kafkaEnabled = this.configService.get<boolean>('KAFKA_ENABLED', false);
        this.topics = this.resolveTopics();
        this.dlqTopic = this.configService.get<string>(
            'KAFKA_TOPIC_IMAGE_UPDATED_DLQ',
            'image.updated.dlq',
        );
        this.maxRetries = Math.max(
            1,
            this.configService.get<number>('KAFKA_IMAGE_UPDATED_MAX_RETRIES', 5),
        );
        this.retryBaseMs = Math.max(
            50,
            this.configService.get<number>('KAFKA_IMAGE_UPDATED_RETRY_BASE_MS', 300),
        );
    }

    async onModuleInit(): Promise<void> {
        if (!this.kafkaEnabled) {
            this.logger.log('Image events consumer disabled (KAFKA_ENABLED=false)');
            return;
        }

        const brokers = (this.configService.get<string>('KAFKA_BROKERS', '') || '')
            .split(',')
            .map((broker) => broker.trim())
            .filter(Boolean);
        const ssl = this.configService.get<boolean>('KAFKA_SSL', false);
        const saslMechanism = this.configService.get<'plain' | 'scram-sha-256' | 'scram-sha-512'>(
            'KAFKA_SASL_MECHANISM',
            'plain',
        );
        const username = this.configService.get<string>('KAFKA_USERNAME', '').trim();
        const password = this.configService.get<string>('KAFKA_PASSWORD', '');

        if (!brokers.length) {
            this.logger.warn('Image events consumer is enabled, but KAFKA_BROKERS is empty');
            return;
        }

        if ((username && !password) || (!username && password)) {
            throw new Error('Kafka auth requires both KAFKA_USERNAME and KAFKA_PASSWORD');
        }

        if (!this.topics.length) {
            this.logger.warn('Image events consumer is enabled, but no entity topics configured');
            return;
        }

        const sasl = !username
            ? undefined
            : saslMechanism === 'plain'
              ? { mechanism: 'plain' as const, username, password }
              : saslMechanism === 'scram-sha-256'
                ? { mechanism: 'scram-sha-256' as const, username, password }
                : { mechanism: 'scram-sha-512' as const, username, password };

        const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'catalog-service');
        const groupId =
            this.configService.get<string>('KAFKA_GROUP_ID_IMAGE_EVENTS', '').trim() ||
            `${clientId}-image-events-consumer`;

        const kafka = new Kafka({
            clientId,
            brokers,
            ssl,
            sasl,
        });

        this.consumer = kafka.consumer({
            groupId,
            allowAutoTopicCreation: false,
        });
        this.producer = kafka.producer({
            allowAutoTopicCreation: false,
        });

        await this.consumer.connect();
        await this.producer.connect();

        for (const topic of this.topics) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
        }

        await this.consumer.run({
            autoCommit: false,
            eachBatchAutoResolve: false,
            eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                for (const message of batch.messages) {
                    if (!isRunning() || isStale()) {
                        return;
                    }

                    const lag = this.calculateLag(batch.highWatermark, message.offset);
                    this.metrics.setConsumerLag(lag);

                    const key = message.key?.toString('utf-8') ?? undefined;
                    const payload = message.value ?? null;

                    try {
                        const result = await this.processWithRetry(() =>
                            this.processImageEvent(batch.topic, payload),
                        );

                        if (result.status === 'invalid') {
                            await this.publishDlq({
                                key,
                                sourceTopic: batch.topic,
                                payload,
                                reason: result.reason || 'Invalid payload',
                                eventId: result.eventId,
                                externalId: result.externalId,
                                eventType: result.eventType,
                            });
                        }

                        this.metrics.incrementConsumed();
                        if (result.status === 'duplicate') {
                            this.metrics.incrementDeduplicated();
                        }

                        this.logger.log(
                            `image event handled: topic=${batch.topic} status=${result.status} eventType=${result.eventType || '-'} eventId=${result.eventId || '-'} externalId=${result.externalId || '-'} updated=${result.updatedRecords ?? 0}`,
                        );

                        const nextOffset = (BigInt(message.offset) + 1n).toString();
                        resolveOffset(message.offset);
                        await this.consumer!.commitOffsets([
                            {
                                topic: batch.topic,
                                partition: batch.partition,
                                offset: nextOffset,
                            },
                        ]);
                        await heartbeat();
                    } catch (error) {
                        this.metrics.incrementFailed();
                        this.logger.error(
                            `image event failed: topic=${batch.topic} partition=${batch.partition} offset=${message.offset} key=${key || '-'} error=${this.stringifyError(error)}`,
                        );
                        throw error;
                    }
                }
            },
        });

        this.logger.log(
            `Image events consumer started topics=[${this.topics.join(',') || '-'}] groupId=${groupId} dlq=${this.dlqTopic}`,
        );
    }

    async onModuleDestroy(): Promise<void> {
        if (this.consumer) {
            await this.consumer.disconnect();
            this.consumer = null;
        }

        if (this.producer) {
            await this.producer.disconnect();
            this.producer = null;
        }
    }

    private async processImageEvent(topic: string, payload: Buffer | null): Promise<ProcessResult> {
        const envelope = this.parseEnvelope(payload);
        if (!envelope) {
            return {
                status: 'invalid',
                sourceTopic: topic,
                reason: 'Payload is not valid JSON object',
            };
        }

        const eventType = this.getStringField(envelope.eventType);
        const eventId = this.getStringField(envelope.eventId);
        const externalId = this.getStringField(envelope.data?.externalId);

        if (!eventType) {
            return {
                status: 'invalid',
                sourceTopic: topic,
                eventId,
                externalId,
                reason: 'eventType is required',
            };
        }

        if (this.matchesEventType(eventType, 'image.uploaded')) {
            if (!envelope.data || typeof envelope.data !== 'object') {
                return {
                    status: 'invalid',
                    sourceTopic: topic,
                    eventId,
                    externalId,
                    eventType,
                    reason: 'data object is required',
                };
            }

            await this.imageEventsService.handleImageUploaded(topic, envelope as ImageUploadedEvent);
            return {
                status: 'processed',
                sourceTopic: topic,
                eventType,
                eventId,
                externalId,
            };
        }

        if (this.matchesEventType(eventType, 'image.deleted')) {
            if (!envelope.data || typeof envelope.data !== 'object') {
                return {
                    status: 'invalid',
                    sourceTopic: topic,
                    eventId,
                    externalId,
                    eventType,
                    reason: 'data object is required',
                };
            }

            await this.imageEventsService.handleImageDeleted(topic, envelope as ImageDeletedEvent);
            return {
                status: 'processed',
                sourceTopic: topic,
                eventType,
                eventId,
                externalId,
            };
        }

        if (this.matchesEventType(eventType, 'image.updated')) {
            const result = await this.imageEventsService.processImageUpdated(topic, payload);
            return {
                ...result,
                sourceTopic: topic,
            };
        }

        return {
            status: 'ignored',
            sourceTopic: topic,
            eventId,
            externalId,
            eventType,
            reason: `Unsupported eventType=${eventType}`,
        };
    }

    private async processWithRetry<T>(handler: () => Promise<T>): Promise<T> {
        let attempt = 0;

        while (true) {
            try {
                return await handler();
            } catch (error) {
                attempt += 1;
                if (attempt >= this.maxRetries) {
                    throw error;
                }

                const delayMs = Math.min(this.retryBaseMs * 2 ** (attempt - 1), 10_000);
                this.logger.warn(
                    `image event temporary error, retry in ${delayMs}ms (attempt=${attempt}/${this.maxRetries}) reason=${this.stringifyError(error)}`,
                );

                await this.sleep(delayMs);
            }
        }
    }

    private async publishDlq(params: {
        key?: string;
        sourceTopic: string;
        payload: Buffer | null;
        reason: string;
        eventId?: string;
        externalId?: string;
        eventType?: string;
    }): Promise<void> {
        if (!this.producer) {
            throw new Error('DLQ producer is not initialized');
        }

        const rawPayload = params.payload?.toString('utf-8') || null;

        await this.producer.send({
            topic: this.dlqTopic,
            messages: [
                {
                    key: params.key || params.externalId || params.eventId || undefined,
                    value: JSON.stringify({
                        sourceTopic: params.sourceTopic,
                        reason: params.reason,
                        eventId: params.eventId ?? null,
                        externalId: params.externalId ?? null,
                        eventType: params.eventType ?? null,
                        receivedAt: new Date().toISOString(),
                        payload: rawPayload,
                    }),
                },
            ],
        });
    }

    private calculateLag(highWatermark: string, currentOffset: string): number {
        try {
            const high = BigInt(highWatermark);
            const current = BigInt(currentOffset);
            const lag = high - current - 1n;
            return Number(lag > 0n ? lag : 0n);
        } catch {
            return 0;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private stringifyError(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private resolveTopics(): string[] {
        return this.bindingsService.getTopics();
    }

    private parseEnvelope(payload: Buffer | null): EventEnvelope | null {
        if (!payload) {
            return null;
        }

        try {
            const parsed = JSON.parse(payload.toString('utf-8')) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return null;
            }

            return parsed as EventEnvelope;
        } catch {
            return null;
        }
    }

    private getStringField(value: unknown): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }

        const normalized = value.trim();
        return normalized || undefined;
    }

    private matchesEventType(
        actualType: string,
        baseType: 'image.uploaded' | 'image.deleted' | 'image.updated',
    ): boolean {
        return actualType === baseType || actualType.endsWith(`.${baseType}`);
    }
}
