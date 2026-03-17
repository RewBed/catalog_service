jest.mock('src/core/database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

import { ImageEventsService } from './image-events.service';
import { ImageEventBindingsService } from './image-event-bindings.service';

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
            $executeRaw: jest.fn(),
            product: {
                findUnique: jest.fn(),
            },
            category: {
                findUnique: jest.fn(),
            },
            productImage: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                deleteMany: jest.fn(),
            },
            categoryImage: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                deleteMany: jest.fn(),
            },
        } as any;
        const bindingsService = {
            resolveEntityType: jest.fn((topic: string, payloadEntityType?: string | null) => ({
                entityType:
                    payloadEntityType ??
                    (topic === 'catalog_product' ? 'catalog.product' : 'catalog.category'),
            })),
        } as unknown as ImageEventBindingsService;

        return {
            service: new ImageEventsService(prisma, bindingsService),
            prisma,
        };
    };

    it('stores uploaded product image with title and description', async () => {
        const tx = createTx();
        const { service, prisma } = createService(tx);
        prisma.product.findUnique.mockResolvedValue({
            id: 10,
            deletedAt: null,
        });
        prisma.productImage.findFirst.mockResolvedValue(null);

        await service.handleImageUploaded('catalog_product', {
            eventType: 'catalog_product.image.uploaded',
            data: {
                externalId: 'ext-1',
                entityId: '10',
                entityType: 'catalog.product',
                imageType: 'main',
                title: 'Main view',
                description: 'Front angle',
            },
        });

        expect(prisma.productImage.create).toHaveBeenCalledWith({
            data: {
                productId: 10,
                url: 'ext-1',
                type: 'main',
                title: 'Main view',
                description: 'Front angle',
                sortOrder: 0,
            },
        });
    });

    it('deletes category image by entity and externalId', async () => {
        const tx = createTx();
        const { service, prisma } = createService(tx);
        prisma.categoryImage.deleteMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 0 });

        await service.handleImageDeleted('catalog_category', {
            eventType: 'catalog_category.image.deleted',
            data: {
                externalId: 'ext-1',
                entityId: '15',
                entityType: 'catalog.category',
                imageType: 'banner',
            },
        });

        expect(prisma.categoryImage.deleteMany).toHaveBeenCalledWith({
            where: {
                categoryId: 15,
                url: 'ext-1',
                type: 'banner',
            },
        });
    });

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

        const result = await service.processImageUpdated('catalog_product', {
            eventId: 'evt-1',
            eventType: 'catalog_product.image.updated',
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

    it('updates image title and description when provided in event', async () => {
        const tx = createTx();
        tx.$queryRaw.mockResolvedValue([]);
        tx.productImage.findMany.mockResolvedValue([
            {
                id: 21,
                updatedAt: new Date('2026-03-10T10:00:00.000Z'),
            },
        ]);
        tx.categoryImage.findMany.mockResolvedValue([]);

        const { service } = createService(tx);

        const result = await service.processImageUpdated('catalog_product', {
            eventId: 'evt-with-meta',
            eventType: 'catalog_product.image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: 'catalog.product',
                entityId: '1',
                previousImageType: 'main',
                imageType: 'gallery',
                previousTitle: null,
                title: 'Updated title',
                previousDescription: null,
                description: 'Updated description',
                updatedAt: '2026-03-10T10:15:30.000Z',
            },
        });

        expect(result.status).toBe('processed');
        expect(result.updatedRecords).toBe(1);
        expect(tx.productImage.update).toHaveBeenCalledWith({
            where: { id: 21 },
            data: {
                type: 'gallery',
                title: 'Updated title',
                description: 'Updated description',
            },
        });
    });

    it('returns duplicate for already processed eventId and does not update data', async () => {
        const tx = createTx();
        tx.$queryRaw.mockResolvedValue([{ eventId: 'evt-dup' }]);

        const { service } = createService(tx);

        const result = await service.processImageUpdated('catalog_product', {
            eventId: 'evt-dup',
            eventType: 'catalog_product.image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: 'catalog.product',
                entityId: '1',
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

        const result = await service.processImageUpdated('catalog_product', {
            eventId: 'evt-stale',
            eventType: 'catalog_product.image.updated',
            eventVersion: 1,
            occurredAt: '2026-03-10T10:15:30.000Z',
            data: {
                externalId: 'ext-1',
                entityType: 'catalog.product',
                entityId: '1',
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

        const result = await service.processImageUpdated('catalog_product', {
            eventType: 'catalog_product.image.updated',
        });

        expect(result.status).toBe('invalid');
        expect(result.reason).toContain('eventId');
    });
});
