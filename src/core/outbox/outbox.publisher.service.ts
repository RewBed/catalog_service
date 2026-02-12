import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { OutboxStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

interface ClaimedOutboxEvent {
    id: string;
    topic: string;
    key: string | null;
    payload: Prisma.JsonValue;
    attempts: number;
}

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OutboxPublisherService.name);
    private readonly kafkaEnabled: boolean;
    private readonly pollIntervalMs: number;
    private readonly batchSize: number;
    private readonly maxAttempts: number;

    private producer: Producer | null = null;
    private intervalHandle: NodeJS.Timeout | null = null;
    private isPublishing = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.kafkaEnabled = this.configService.get<boolean>('KAFKA_ENABLED', false);
        this.pollIntervalMs = this.configService.get<number>('KAFKA_OUTBOX_POLL_INTERVAL_MS', 2000);
        this.batchSize = this.configService.get<number>('KAFKA_OUTBOX_BATCH_SIZE', 100);
        this.maxAttempts = this.configService.get<number>('KAFKA_OUTBOX_MAX_ATTEMPTS', 10);
    }

    async onModuleInit(): Promise<void> {
        if (!this.kafkaEnabled) {
            this.logger.log('Kafka publisher disabled (KAFKA_ENABLED=false)');
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
            this.logger.warn('Kafka publisher is enabled, but KAFKA_BROKERS is empty');
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

        const kafka = new Kafka({
            clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'image-service'),
            brokers,
            ssl,
            sasl,
        });

        this.producer = kafka.producer({
            allowAutoTopicCreation: false,
        });

        await this.producer.connect();

        this.intervalHandle = setInterval(() => {
            void this.publishPendingEvents();
        }, this.pollIntervalMs);
        this.intervalHandle.unref?.();

        void this.publishPendingEvents();

        this.logger.log(`Kafka outbox publisher started (poll=${this.pollIntervalMs}ms, batch=${this.batchSize})`);
    }

    async onModuleDestroy(): Promise<void> {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }

        if (this.producer) {
            await this.producer.disconnect();
            this.producer = null;
        }
    }

    private async publishPendingEvents(): Promise<void> {
        if (!this.producer || this.isPublishing) {
            return;
        }

        this.isPublishing = true;
        try {
            const events = await this.claimPendingEvents();
            for (const event of events) {
                await this.publishSingleEvent(event);
            }
        } catch (error) {
            this.logger.error(`Outbox publish cycle failed: ${this.stringifyError(error)}`);
        } finally {
            this.isPublishing = false;
        }
    }

    private async claimPendingEvents(): Promise<ClaimedOutboxEvent[]> {
        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<ClaimedOutboxEvent[]>`
                SELECT id, topic, key, payload, attempts
                FROM "OutboxEvent"
                WHERE status = ${OutboxStatus.PENDING} AND "nextAttemptAt" <= NOW()
                ORDER BY "createdAt" ASC
                LIMIT ${this.batchSize}
                FOR UPDATE SKIP LOCKED
            `;

            if (!rows.length) {
                return [];
            }

            await tx.outboxEvent.updateMany({
                where: { id: { in: rows.map((row) => row.id) } },
                data: { status: OutboxStatus.PROCESSING },
            });

            return rows;
        });
    }

    private async publishSingleEvent(event: ClaimedOutboxEvent): Promise<void> {
        if (!this.producer) {
            return;
        }

        try {
            await this.producer.send({
                topic: event.topic,
                messages: [
                    {
                        key: event.key ?? undefined,
                        value: JSON.stringify(event.payload),
                    },
                ],
            });

            await this.prisma.outboxEvent.update({
                where: { id: event.id },
                data: {
                    status: OutboxStatus.SENT,
                    publishedAt: new Date(),
                    lastError: null,
                },
            });
        } catch (error) {
            const nextAttempts = event.attempts + 1;
            const reachedMaxAttempts = nextAttempts >= this.maxAttempts;

            await this.prisma.outboxEvent.update({
                where: { id: event.id },
                data: {
                    status: reachedMaxAttempts ? OutboxStatus.FAILED : OutboxStatus.PENDING,
                    attempts: { increment: 1 },
                    nextAttemptAt: this.calculateNextAttemptAt(nextAttempts),
                    lastError: this.stringifyError(error),
                },
            });

            this.logger.warn(`Failed to publish outbox event ${event.id}: ${this.stringifyError(error)}`);
        }
    }

    private calculateNextAttemptAt(attempt: number): Date {
        const delayMs = Math.min(1000 * (2 ** attempt), 15 * 60 * 1000);
        return new Date(Date.now() + delayMs);
    }

    private stringifyError(error: unknown): string {
        if (error instanceof Error) {
            return error.message.slice(0, 1000);
        }

        return String(error).slice(0, 1000);
    }
}
