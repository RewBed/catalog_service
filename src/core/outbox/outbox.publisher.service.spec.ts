jest.mock('../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  OutboxStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    FAILED: 'FAILED',
  },
  Prisma: {},
}));

import { OutboxPublisherService } from './outbox.publisher.service';

const createConfigService = (overrides?: Record<string, unknown>) => {
  const values: Record<string, unknown> = {
    KAFKA_ENABLED: false,
    KAFKA_BROKERS: 'localhost:9092',
    KAFKA_CLIENT_ID: 'catalog-service',
    KAFKA_SSL: false,
    KAFKA_SASL_MECHANISM: 'plain',
    KAFKA_USERNAME: '',
    KAFKA_PASSWORD: '',
    KAFKA_OUTBOX_POLL_INTERVAL_MS: 2000,
    KAFKA_OUTBOX_BATCH_SIZE: 100,
    KAFKA_OUTBOX_MAX_ATTEMPTS: 3,
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback,
    ),
  };
};

const createPrismaMock = () => ({
  $transaction: jest.fn(),
  outboxEvent: {
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('OutboxPublisherService', () => {
  it('does nothing on module init when kafka is disabled', async () => {
    const prisma = createPrismaMock();
    const configService = createConfigService({ KAFKA_ENABLED: false });
    const service = new OutboxPublisherService(prisma as any, configService as any);

    await service.onModuleInit();

    expect((service as any).producer).toBeNull();
  });

  it('marks outbox event as sent after successful publish', async () => {
    const prisma = createPrismaMock();
    const configService = createConfigService();
    const service = new OutboxPublisherService(prisma as any, configService as any);
    const producer = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).producer = producer;

    await (service as any).publishSingleEvent({
      id: 'evt-1',
      topic: 'catalog.product.updated',
      key: 'product-1',
      payload: { id: 1, name: 'Product' },
      attempts: 0,
    });

    expect(producer.send).toHaveBeenCalledWith({
      topic: 'catalog.product.updated',
      messages: [
        {
          key: 'product-1',
          value: JSON.stringify({ id: 1, name: 'Product' }),
        },
      ],
    });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: {
        status: 'SENT',
        publishedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('marks outbox event as failed after reaching max attempts', async () => {
    const prisma = createPrismaMock();
    const configService = createConfigService({
      KAFKA_OUTBOX_MAX_ATTEMPTS: 3,
    });
    const service = new OutboxPublisherService(prisma as any, configService as any);
    const producer = {
      send: jest.fn().mockRejectedValue(new Error('kafka unavailable')),
    };
    (service as any).producer = producer;

    await (service as any).publishSingleEvent({
      id: 'evt-2',
      topic: 'catalog.product.updated',
      key: null,
      payload: { id: 2 },
      attempts: 2,
    });

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-2' },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        nextAttemptAt: expect.any(Date),
        lastError: 'kafka unavailable',
      },
    });
  });

  it('claims pending events and marks them as processing', async () => {
    const prisma = createPrismaMock();
    const configService = createConfigService({
      KAFKA_OUTBOX_BATCH_SIZE: 2,
    });
    const service = new OutboxPublisherService(prisma as any, configService as any);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'evt-1',
          topic: 'topic-1',
          key: 'k1',
          payload: { hello: 'world' },
          attempts: 0,
        },
      ]),
      outboxEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const events = await (service as any).claimPendingEvents();

    expect(events).toEqual([
      {
        id: 'evt-1',
        topic: 'topic-1',
        key: 'k1',
        payload: { hello: 'world' },
        attempts: 0,
      },
    ]);
    expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['evt-1'] } },
      data: { status: 'PROCESSING' },
    });
  });
});
