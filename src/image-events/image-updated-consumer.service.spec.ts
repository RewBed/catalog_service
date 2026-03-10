jest.mock('src/core/database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

import { ImageEventsMetrics } from './image-events.metrics';
import { ImageEventsService } from './image-events.service';
import { ImageUpdatedConsumerService } from './image-updated-consumer.service';

const mockConsumer = {
    connect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(),
    commitOffsets: jest.fn(),
    disconnect: jest.fn(),
};

const mockProducer = {
    connect: jest.fn(),
    send: jest.fn(),
    disconnect: jest.fn(),
};

jest.mock('kafkajs', () => ({
    Kafka: jest.fn().mockImplementation(() => ({
        consumer: () => mockConsumer,
        producer: () => mockProducer,
    })),
}));

describe('ImageUpdatedConsumerService', () => {
    const createConfigService = (overrides?: Record<string, unknown>) => {
        const values: Record<string, unknown> = {
            KAFKA_ENABLED: true,
            KAFKA_BROKERS: 'localhost:9092',
            KAFKA_CLIENT_ID: 'catalog-service',
            KAFKA_SSL: false,
            KAFKA_SASL_MECHANISM: 'plain',
            KAFKA_USERNAME: '',
            KAFKA_PASSWORD: '',
            KAFKA_TOPIC_IMAGE_UPDATED: 'image.updated',
            KAFKA_GROUP_ID_IMAGE_UPDATED: 'catalog-image-updated',
            KAFKA_TOPIC_IMAGE_UPDATED_DLQ: 'image.updated.dlq',
            KAFKA_IMAGE_UPDATED_MAX_RETRIES: 3,
            KAFKA_IMAGE_UPDATED_RETRY_BASE_MS: 1,
            ...overrides,
        };

        return {
            get: jest.fn((key: string, fallback?: unknown) =>
                Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback,
            ),
        } as any;
    };

    const createBatchPayload = (value: Buffer | null) => ({
        batch: {
            topic: 'image.updated',
            partition: 0,
            highWatermark: '10',
            messages: [
                {
                    offset: '5',
                    key: Buffer.from('ext-1'),
                    value,
                },
            ],
        },
        resolveOffset: jest.fn(),
        heartbeat: jest.fn().mockResolvedValue(undefined),
        isRunning: jest.fn(() => true),
        isStale: jest.fn(() => false),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsumer.connect.mockResolvedValue(undefined);
        mockConsumer.subscribe.mockResolvedValue(undefined);
        mockConsumer.run.mockResolvedValue(undefined);
        mockConsumer.commitOffsets.mockResolvedValue(undefined);
        mockConsumer.disconnect.mockResolvedValue(undefined);

        mockProducer.connect.mockResolvedValue(undefined);
        mockProducer.send.mockResolvedValue(undefined);
        mockProducer.disconnect.mockResolvedValue(undefined);
    });

    it('sends invalid payload to DLQ and commits offset', async () => {
        const configService = createConfigService();
        const imageEventsService = {
            processImageUpdated: jest.fn().mockResolvedValue({
                status: 'invalid',
                reason: 'eventId is required',
                eventType: 'image.updated',
                externalId: 'ext-1',
            }),
        } as unknown as ImageEventsService;
        const metrics = {
            incrementConsumed: jest.fn(),
            incrementFailed: jest.fn(),
            incrementDeduplicated: jest.fn(),
            setConsumerLag: jest.fn(),
        } as unknown as ImageEventsMetrics;

        const service = new ImageUpdatedConsumerService(configService, imageEventsService, metrics);
        await service.onModuleInit();

        const runArgs = mockConsumer.run.mock.calls[0][0];
        const payload = createBatchPayload(Buffer.from('{"bad":true}'));

        await runArgs.eachBatch(payload);

        expect(mockProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                topic: 'image.updated.dlq',
            }),
        );
        expect(mockConsumer.commitOffsets).toHaveBeenCalledWith([
            {
                topic: 'image.updated',
                partition: 0,
                offset: '6',
            },
        ]);
        expect((metrics.incrementConsumed as jest.Mock)).toHaveBeenCalledTimes(1);
        expect((metrics.incrementFailed as jest.Mock)).not.toHaveBeenCalled();
    });

    it('retries temporary processing error', async () => {
        const configService = createConfigService({
            KAFKA_IMAGE_UPDATED_MAX_RETRIES: 2,
        });
        const imageEventsService = {
            processImageUpdated: jest
                .fn()
                .mockRejectedValueOnce(new Error('temporary db error'))
                .mockResolvedValue({
                    status: 'processed',
                    eventId: 'evt-1',
                    externalId: 'ext-1',
                    eventType: 'image.updated',
                    updatedRecords: 1,
                }),
        } as unknown as ImageEventsService;
        const metrics = {
            incrementConsumed: jest.fn(),
            incrementFailed: jest.fn(),
            incrementDeduplicated: jest.fn(),
            setConsumerLag: jest.fn(),
        } as unknown as ImageEventsMetrics;

        const service = new ImageUpdatedConsumerService(configService, imageEventsService, metrics);
        jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

        await service.onModuleInit();

        const runArgs = mockConsumer.run.mock.calls[0][0];
        const payload = createBatchPayload(Buffer.from('{"eventId":"evt-1"}'));

        await runArgs.eachBatch(payload);

        expect((imageEventsService.processImageUpdated as jest.Mock).mock.calls.length).toBe(2);
        expect(mockConsumer.commitOffsets).toHaveBeenCalledWith([
            {
                topic: 'image.updated',
                partition: 0,
                offset: '6',
            },
        ]);
        expect((metrics.incrementConsumed as jest.Mock)).toHaveBeenCalledTimes(1);
    });
});
