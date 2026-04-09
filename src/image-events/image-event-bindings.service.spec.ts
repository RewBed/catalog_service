import { ImageEventBindingsService } from './image-event-bindings.service';

type ConfigServiceMock = {
  get: jest.Mock;
};

const createConfigService = (bindings: string): ConfigServiceMock => ({
  get: jest.fn((key: string, fallback?: unknown) =>
    key === 'KAFKA_IMAGE_EVENT_ENTITY_TOPICS' ? bindings : fallback,
  ),
});

describe('ImageEventBindingsService', () => {
  it('parses bindings and resolves topics in both directions', () => {
    const configService = createConfigService(
      'catalog.product=catalog_product,catalog.category=catalog_category',
    );
    const service = new ImageEventBindingsService(configService as any);

    expect(service.getTopics()).toEqual(['catalog_product', 'catalog_category']);
    expect(service.getEntityTypeByTopic('catalog_product')).toBe('catalog.product');
    expect(service.getTopicByEntityType('catalog.category')).toBe('catalog_category');
  });

  it('resolves entity type from payload when topic mapping exists', () => {
    const configService = createConfigService('catalog.product=catalog_product');
    const service = new ImageEventBindingsService(configService as any);

    const result = service.resolveEntityType('catalog_product', 'catalog.product');

    expect(result).toEqual({ entityType: 'catalog.product' });
  });

  it('returns reason on topic/payload mismatch', () => {
    const configService = createConfigService('catalog.product=catalog_product');
    const service = new ImageEventBindingsService(configService as any);

    const result = service.resolveEntityType('catalog_product', 'catalog.category');

    expect(result.entityType).toBeUndefined();
    expect(result.reason).toContain('catalog_product');
  });

  it('throws for malformed binding entry', () => {
    const configService = createConfigService('catalog.product');

    expect(() => new ImageEventBindingsService(configService as any)).toThrow(
      'Invalid KAFKA_IMAGE_EVENT_ENTITY_TOPICS entry',
    );
  });

  it('throws for duplicate topics or entity types', () => {
    const duplicateTopicConfig = createConfigService(
      'catalog.product=catalog_topic,catalog.category=catalog_topic',
    );
    const duplicateEntityConfig = createConfigService(
      'catalog.product=catalog_topic,catalog.product=another_topic',
    );

    expect(() => new ImageEventBindingsService(duplicateTopicConfig as any)).toThrow(
      'Duplicate topic',
    );
    expect(() => new ImageEventBindingsService(duplicateEntityConfig as any)).toThrow(
      'Duplicate entityType',
    );
  });
});
