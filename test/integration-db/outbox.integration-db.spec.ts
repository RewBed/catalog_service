import { OutboxStatus } from 'generated/prisma/client';
import { OutboxPublisherService } from 'src/core/outbox/outbox.publisher.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: OutboxEvent / OutboxPublisherService', () => {
  const ctx = createIntegrationPrismaContext();
  const config = {
    get: (key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        KAFKA_ENABLED: false,
        KAFKA_OUTBOX_BATCH_SIZE: 100,
        KAFKA_OUTBOX_MAX_ATTEMPTS: 3,
      };

      return key in values ? values[key] : fallback;
    },
  };
  const service = new OutboxPublisherService(ctx.prisma as any, config as any);

  beforeAll(async () => {
    await ctx.prisma.$connect();
  });

  beforeEach(async () => {
    await truncateAllPublicTables(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.prisma.$disconnect();
    await ctx.pool.end();
  });

  it('claims pending outbox events and marks them as PROCESSING', async () => {
    const first = await ctx.prisma.outboxEvent.create({
      data: {
        topic: 'catalog.product.updated',
        eventType: 'catalog.product.updated',
        payload: {
          id: 1,
        },
        status: OutboxStatus.PENDING,
      },
    });
    await ctx.prisma.outboxEvent.create({
      data: {
        topic: 'catalog.product.updated',
        eventType: 'catalog.product.updated',
        payload: {
          id: 2,
        },
        status: OutboxStatus.FAILED,
      },
    });

    const claimed = await (service as any).claimPendingEvents();

    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe(first.id);

    const updated = await ctx.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: first.id },
      select: { status: true },
    });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
  });

  it('marks outbox event as SENT after successful publish', async () => {
    const event = await ctx.prisma.outboxEvent.create({
      data: {
        topic: 'catalog.product.updated',
        eventType: 'catalog.product.updated',
        key: 'product-1',
        payload: {
          id: 1,
        },
        status: OutboxStatus.PROCESSING,
      },
    });

    (service as any).producer = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    await (service as any).publishSingleEvent({
      id: event.id,
      topic: event.topic,
      key: event.key,
      payload: event.payload,
      attempts: event.attempts,
    });

    const sent = await ctx.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
      select: {
        status: true,
        publishedAt: true,
        lastError: true,
      },
    });

    expect(sent.status).toBe(OutboxStatus.SENT);
    expect(sent.publishedAt).not.toBeNull();
    expect(sent.lastError).toBeNull();
  });
});
