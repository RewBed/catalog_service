import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { ImageEventsMetrics } from './image-events.metrics';
import { ImageEventsService } from './image-events.service';

@Injectable()
export class ImageUpdatedConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ImageUpdatedConsumerService.name);
    private readonly kafkaEnabled: boolean;
    private readonly topic: string;
    private readonly dlqTopic: string;
    private readonly maxRetries: number;
    private readonly retryBaseMs: number;

    private consumer: Consumer | null = null;
    private producer: Producer | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly imageEventsService: ImageEventsService,
        private readonly metrics: ImageEventsMetrics,
    ) {
        this.kafkaEnabled = this.configService.get<boolean>('KAFKA_ENABLED', false);
        this.topic = this.configService.get<string>('KAFKA_TOPIC_IMAGE_UPDATED', 'image.updated');
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
            this.logger.log('Image updated consumer disabled (KAFKA_ENABLED=false)');
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
            this.logger.warn('Image updated consumer is enabled, but KAFKA_BROKERS is empty');
            return;
        }

        if ((username && !password) || (!username && password)) {
            throw new Error('Kafka auth requires both KAFKA_USERNAME and KAFKA_PASSWORD');
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
            this.configService.get<string>('KAFKA_GROUP_ID_IMAGE_UPDATED', '').trim() ||
            `${clientId}-image-updated-consumer`;

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
        await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

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
                            this.imageEventsService.processImageUpdated(this.topic, payload),
                        );

                        if (result.status === 'invalid') {
                            await this.publishDlq({
                                key,
                                payload,
                                reason: result.reason || 'Invalid payload',
                                eventId: result.eventId,
                                externalId: result.externalId,
                            });
                        }

                        this.metrics.incrementConsumed();
                        if (result.status === 'duplicate') {
                            this.metrics.incrementDeduplicated();
                        }

                        this.logger.log(
                            `image.updated handled: status=${result.status} eventId=${result.eventId || '-'} externalId=${result.externalId || '-'} eventType=${result.eventType || '-'} updated=${result.updatedRecords ?? 0}`,
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
                            `image.updated failed: topic=${batch.topic} partition=${batch.partition} offset=${message.offset} key=${key || '-'} error=${this.stringifyError(error)}`,
                        );
                        throw error;
                    }
                }
            },
        });

        this.logger.log(
            `Image updated consumer started topic=${this.topic} groupId=${groupId} dlq=${this.dlqTopic}`,
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
                    `image.updated temporary error, retry in ${delayMs}ms (attempt=${attempt}/${this.maxRetries}) reason=${this.stringifyError(error)}`,
                );

                await this.sleep(delayMs);
            }
        }
    }

    private async publishDlq(params: {
        key?: string;
        payload: Buffer | null;
        reason: string;
        eventId?: string;
        externalId?: string;
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
                        sourceTopic: this.topic,
                        reason: params.reason,
                        eventId: params.eventId ?? null,
                        externalId: params.externalId ?? null,
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
}
