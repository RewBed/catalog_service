jest.mock('src/core/database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

import { ImageEventsService } from './image-events.service';

describe('ImageEventsService image.updated', () => {
    const createTx = () => ({
        $queryRaw: jest.fn(),
        productImage: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
        categoryImage: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
        $executeRaw: jest.fn(),
    });

    const createService = (tx: ReturnType<typeof createTx>) => {
        const prisma = {
            $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<unknown>) =>
                callback(tx),
            ),
        } as any;

        return {
            service: new ImageEventsService(prisma),
            prisma,
        };
    };

    it('processes valid event and updates image type by externalId', async () => {
        const tx = createTx();
        tx.$queryRaw.mockResolvedValue([]);
        tx.productImage.findMany.mockResolvedValue([
            {
                id: 11,
                updatedAt: new Date('2026-03-10T10:00:00.000Z'),
            },
        ]);
        tx.categoryImage.findMany.mockResolvedValue([]);

        const { service } = createService(tx);

        const result = await service.processImageUpdated('image.updated', {
            eventId: 'evt-1',
            eventType: 'image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: 'catalog.product',
                entityId: '1',
                previousImageType: 'main',
                imageType: 'gallery',
                updatedAt: '2026-03-10T10:15:30.000Z',
            },
        });

        expect(result.status).toBe('processed');
        expect(result.updatedRecords).toBe(1);
        expect(tx.productImage.update).toHaveBeenCalledWith({
            where: { id: 11 },
            data: { type: 'gallery' },
        });
        expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('returns duplicate for already processed eventId and does not update data', async () => {
        const tx = createTx();
        tx.$queryRaw.mockResolvedValue([{ eventId: 'evt-dup' }]);

        const { service } = createService(tx);

        const result = await service.processImageUpdated('image.updated', {
            eventId: 'evt-dup',
            eventType: 'image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: null,
                entityId: null,
                previousImageType: null,
                imageType: 'gallery',
                updatedAt: '2026-03-10T10:15:30.000Z',
            },
        });

        expect(result.status).toBe('duplicate');
        expect(tx.productImage.findMany).not.toHaveBeenCalled();
        expect(tx.categoryImage.findMany).not.toHaveBeenCalled();
        expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('marks event as stale when local image updatedAt is newer', async () => {
        const tx = createTx();
        tx.$queryRaw.mockResolvedValue([]);
        tx.productImage.findMany.mockResolvedValue([
            {
                id: 42,
                updatedAt: new Date('2026-03-10T11:00:00.000Z'),
            },
        ]);
        tx.categoryImage.findMany.mockResolvedValue([]);

        const { service } = createService(tx);

        const result = await service.processImageUpdated('image.updated', {
            eventId: 'evt-stale',
            eventType: 'image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: null,
                entityId: null,
                previousImageType: null,
                imageType: 'main',
                updatedAt: '2026-03-10T10:15:30.000Z',
            },
        });

        expect(result.status).toBe('stale');
        expect(result.updatedRecords).toBe(0);
        expect(tx.productImage.update).not.toHaveBeenCalled();
        expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('returns invalid when payload is malformed', async () => {
        const tx = createTx();
        const { service } = createService(tx);

        const result = await service.processImageUpdated('image.updated', {
            eventType: 'image.updated',
        });

        expect(result.status).toBe('invalid');
        expect(result.reason).toContain('eventId');
    });
});
