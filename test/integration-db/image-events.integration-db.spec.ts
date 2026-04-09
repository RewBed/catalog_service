import { ImageEventBindingsService } from 'src/image-events/image-event-bindings.service';
import { ImageEventsService } from 'src/image-events/image-events.service';
import {
  createIntegrationPrismaContext,
  truncateAllPublicTables,
} from './helpers/prisma-integration';

describe('Integration DB: ImageEventsService', () => {
  const ctx = createIntegrationPrismaContext();
  const bindings = new ImageEventBindingsService({
    get: (key: string, fallback?: string) =>
      key === 'KAFKA_IMAGE_EVENT_ENTITY_TOPICS'
        ? 'catalog.product=catalog_product,catalog.category=catalog_category'
        : fallback,
  } as any);
  const service = new ImageEventsService(ctx.prisma as any, bindings);

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

  async function seedProduct() {
    const category = await ctx.prisma.category.create({
      data: {
        name: 'Tables',
        slug: 'tables',
      },
    });

    return ctx.prisma.product.create({
      data: {
        name: 'Oak Table 120',
        slug: 'oak-table-120',
        sku: 'SKU-120',
        price: 1000,
        categoryId: category.id,
      },
    });
  }

  async function seedCategory() {
    return ctx.prisma.category.create({
      data: {
        name: 'Decor',
        slug: 'decor',
      },
    });
  }

  it('stores uploaded product image and deletes it by event', async () => {
    const product = await seedProduct();

    await service.handleImageUploaded('catalog_product', {
      eventType: 'catalog_product.image.uploaded',
      data: {
        externalId: 'cdn://img/1',
        entityType: 'catalog.product',
        entityId: String(product.id),
        imageType: 'main',
        title: 'Main',
        description: 'Main shot',
      },
    });

    let images = await ctx.prisma.productImage.findMany({
      where: {
        productId: product.id,
      },
    });
    expect(images).toHaveLength(1);
    expect(images[0]!.title).toBe('Main');

    await service.handleImageDeleted('catalog_product', {
      eventType: 'catalog_product.image.deleted',
      data: {
        externalId: 'cdn://img/1',
        entityType: 'catalog.product',
        entityId: String(product.id),
        imageType: 'main',
      },
    });

    images = await ctx.prisma.productImage.findMany({
      where: {
        productId: product.id,
      },
    });
    expect(images).toHaveLength(0);
  });

  it('updates category image metadata and writes inbox event once (dedup by eventId)', async () => {
    const category = await seedCategory();

    const existing = await ctx.prisma.categoryImage.create({
      data: {
        categoryId: category.id,
        type: 'main',
        url: 'cdn://cat/1',
        title: 'Old title',
        description: 'Old description',
      },
    });

    const payload = {
      eventId: 'evt-image-1',
      eventType: 'catalog_category.image.updated',
      eventVersion: 1,
      occurredAt: '2026-03-10T10:15:30.000Z',
      data: {
        externalId: 'cdn://cat/1',
        entityType: 'catalog.category',
        entityId: String(category.id),
        previousImageType: 'main',
        imageType: 'banner',
        previousTitle: 'Old title',
        title: 'New title',
        previousDescription: 'Old description',
        description: 'New description',
        updatedAt: '2099-03-10T11:15:30.000Z',
      },
    };

    const first = await service.processImageUpdated('catalog_category', payload);
    const second = await service.processImageUpdated('catalog_category', payload);

    expect(first.status).toBe('processed');
    expect(first.updatedRecords).toBe(1);
    expect(second.status).toBe('duplicate');

    const updated = await ctx.prisma.categoryImage.findUniqueOrThrow({
      where: { id: existing.id },
      select: {
        type: true,
        title: true,
        description: true,
      },
    });
    const inboxRows = await ctx.prisma.inboxEvent.findMany({
      where: { eventId: 'evt-image-1' },
    });

    expect(updated.type).toBe('banner');
    expect(updated.title).toBe('New title');
    expect(updated.description).toBe('New description');
    expect(inboxRows).toHaveLength(1);
  });

  it('returns stale for outdated image.updated event', async () => {
    const product = await seedProduct();
    const image = await ctx.prisma.productImage.create({
      data: {
        productId: product.id,
        type: 'main',
        url: 'cdn://img/old',
      },
    });

    const stale = await service.processImageUpdated('catalog_product', {
      eventId: 'evt-stale',
      eventType: 'catalog_product.image.updated',
      eventVersion: 1,
      occurredAt: '2026-03-10T10:15:30.000Z',
      data: {
        externalId: 'cdn://img/old',
        entityType: 'catalog.product',
        entityId: String(product.id),
        previousImageType: 'main',
        imageType: 'gallery',
        updatedAt: image.updatedAt.toISOString(),
      },
    });

    expect(stale.status).toBe('stale');
    expect(stale.updatedRecords).toBe(0);
  });
});
