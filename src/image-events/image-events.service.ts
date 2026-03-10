import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

export type ImageEventData = {
    path?: string;
    externalId?: string;
    entityId: string;
    entityType: string;
    imageType?: string;
};

export type ImageUploadedEvent = {
    data: ImageEventData;
    eventType: 'image.uploaded' | string;
};

export type ImageDeletedEvent = {
    data: ImageEventData;
    eventType: 'image.deleted' | string;
};

export type ImageUpdatedEventV1 = {
    eventId: string;
    eventType: string;
    eventVersion: number;
    occurredAt: string;
    data: {
        externalId: string;
        entityType: string | null;
        entityId: string | null;
        previousImageType: string | null;
        imageType: string | null;
        updatedAt: string;
    };
};

export type ImageUpdatedProcessResultStatus =
    | 'processed'
    | 'duplicate'
    | 'stale'
    | 'invalid'
    | 'ignored';

export type ImageUpdatedProcessResult = {
    status: ImageUpdatedProcessResultStatus;
    eventId?: string;
    externalId?: string;
    eventType?: string;
    reason?: string;
    updatedRecords?: number;
};

@Injectable()
export class ImageEventsService {
    private readonly logger = new Logger(ImageEventsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async handleImageUploaded(event: ImageUploadedEvent): Promise<void> {
        const parsed = this.parseCommonEventData(event.data);
        if (!parsed) {
            return;
        }

        const { entityId, entityType, externalId, type } = parsed;

        if (entityType === 'catalog.product') {
            await this.saveProductImage(entityId, externalId, type);
            return;
        }

        if (entityType === 'catalog.category') {
            await this.saveCategoryImage(entityId, externalId, type);
            return;
        }

        this.logger.warn(`Skipped event with unsupported entityType=${entityType}`);
    }

    async handleImageDeleted(event: ImageDeletedEvent): Promise<void> {
        const parsed = this.parseCommonEventData(event.data);
        if (!parsed) {
            return;
        }

        const { entityId, entityType, externalId, type } = parsed;

        if (entityType === 'catalog.product') {
            await this.deleteProductImage(entityId, externalId, type);
            return;
        }

        if (entityType === 'catalog.category') {
            await this.deleteCategoryImage(entityId, externalId, type);
            return;
        }

        this.logger.warn(`Skipped event with unsupported entityType=${entityType}`);
    }

    async processImageUpdated(topic: string, payload: unknown): Promise<ImageUpdatedProcessResult> {
        const parsed = this.parseImageUpdatedPayload(payload);

        if (!parsed.ok) {
            if (parsed.eventId) {
                try {
                    await this.registerInboxEvent(
                        parsed.eventId,
                        topic,
                        parsed.eventType || 'image.updated',
                        parsed.eventVersion ?? 0,
                        parsed.externalId,
                    );
                } catch (error) {
                    if (this.isPrismaUniqueViolation(error)) {
                        return {
                            status: 'duplicate',
                            reason: parsed.reason,
                            eventId: parsed.eventId,
                            externalId: parsed.externalId,
                            eventType: parsed.eventType,
                        };
                    }

                    throw error;
                }
            }

            return {
                status: 'invalid',
                reason: parsed.reason,
                eventId: parsed.eventId,
                externalId: parsed.externalId,
                eventType: parsed.eventType,
            };
        }

        const event = parsed.event;

        if (event.eventType !== 'image.updated') {
            return {
                status: 'ignored',
                eventId: event.eventId,
                externalId: event.data.externalId,
                eventType: event.eventType,
                reason: `Unsupported eventType=${event.eventType}`,
            };
        }

        if (event.eventVersion !== 1) {
            return {
                status: 'ignored',
                eventId: event.eventId,
                externalId: event.data.externalId,
                eventType: event.eventType,
                reason: `Unsupported eventVersion=${event.eventVersion}`,
            };
        }

        const externalId = event.data.externalId.trim();
        const eventUpdatedAt = new Date(event.data.updatedAt);
        const nextType = event.data.imageType?.trim() || 'default';

        try {
            const transactionResult = await this.prisma.$transaction(async (tx) => {
                const processedRows = await tx.$queryRaw<{ eventId: string }[]>`
                    SELECT "eventId"
                    FROM "InboxEvent"
                    WHERE "eventId" = ${event.eventId}
                    LIMIT 1
                `;
                const processed = processedRows[0] ?? null;

                if (processed) {
                    return {
                        status: 'duplicate' as const,
                        updatedRecords: 0,
                    };
                }

                const productImages = await tx.productImage.findMany({
                    where: { url: externalId },
                    select: {
                        id: true,
                        updatedAt: true,
                    },
                });

                const categoryImages = await tx.categoryImage.findMany({
                    where: { url: externalId },
                    select: {
                        id: true,
                        updatedAt: true,
                    },
                });

                let updatedRecords = 0;
                let staleSkips = 0;

                for (const image of productImages) {
                    if (eventUpdatedAt <= image.updatedAt) {
                        staleSkips += 1;
                        continue;
                    }

                    await tx.productImage.update({
                        where: { id: image.id },
                        data: {
                            type: nextType,
                        },
                    });

                    updatedRecords += 1;
                }

                for (const image of categoryImages) {
                    if (eventUpdatedAt <= image.updatedAt) {
                        staleSkips += 1;
                        continue;
                    }

                    await tx.categoryImage.update({
                        where: { id: image.id },
                        data: {
                            type: nextType,
                        },
                    });

                    updatedRecords += 1;
                }

                await tx.$executeRaw`
                    INSERT INTO "InboxEvent" ("eventId", "topic", "eventType", "eventVersion", "externalId")
                    VALUES (${event.eventId}, ${topic}, ${event.eventType}, ${event.eventVersion}, ${externalId})
                `;

                const totalFound = productImages.length + categoryImages.length;
                if (updatedRecords === 0 && totalFound > 0 && staleSkips > 0) {
                    return {
                        status: 'stale' as const,
                        updatedRecords,
                    };
                }

                return {
                    status: 'processed' as const,
                    updatedRecords,
                };
            });

            return {
                ...transactionResult,
                eventId: event.eventId,
                externalId,
                eventType: event.eventType,
            };
        } catch (error) {
            if (this.isPrismaUniqueViolation(error)) {
                return {
                    status: 'duplicate',
                    eventId: event.eventId,
                    externalId,
                    eventType: event.eventType,
                    updatedRecords: 0,
                };
            }

            throw error;
        }
    }

    private isPrismaUniqueViolation(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        return (error as { code?: unknown }).code === 'P2002';
    }

    private async registerInboxEvent(
        eventId: string,
        topic: string,
        eventType: string,
        eventVersion: number,
        externalId?: string,
    ): Promise<void> {
        await this.prisma.$executeRaw`
            INSERT INTO "InboxEvent" ("eventId", "topic", "eventType", "eventVersion", "externalId")
            VALUES (${eventId}, ${topic}, ${eventType}, ${eventVersion}, ${externalId ?? null})
        `;
    }

    private parseImageUpdatedPayload(payload: unknown):
        | { ok: true; event: ImageUpdatedEventV1 }
        | {
              ok: false;
              reason: string;
              eventId?: string;
              externalId?: string;
              eventType?: string;
              eventVersion?: number;
          } {
        const source = this.extractPayloadValue(payload);

        const envelope = this.parseObject(source);
        if (!envelope) {
            return {
                ok: false,
                reason: 'Payload is not valid JSON object',
            };
        }

        const eventId = typeof envelope.eventId === 'string' ? envelope.eventId.trim() : '';
        const eventType = typeof envelope.eventType === 'string' ? envelope.eventType : undefined;
        const eventVersion =
            typeof envelope.eventVersion === 'number' && Number.isInteger(envelope.eventVersion)
                ? envelope.eventVersion
                : undefined;

        const dataCandidate = envelope.data as Record<string, unknown> | undefined;
        const externalId =
            dataCandidate && typeof dataCandidate.externalId === 'string'
                ? dataCandidate.externalId.trim()
                : undefined;

        if (!eventId) {
            return {
                ok: false,
                reason: 'eventId is required',
                eventType,
                eventVersion,
                externalId,
            };
        }

        if (!eventType) {
            return {
                ok: false,
                reason: 'eventType is required',
                eventId,
                eventVersion,
                externalId,
            };
        }

        if (!Number.isInteger(envelope.eventVersion)) {
            return {
                ok: false,
                reason: 'eventVersion must be integer',
                eventId,
                eventType,
                eventVersion,
                externalId,
            };
        }

        if (!this.isIsoDateTime(envelope.occurredAt)) {
            return {
                ok: false,
                reason: 'occurredAt must be valid date-time',
                eventId,
                eventType,
                eventVersion,
                externalId,
            };
        }

        if (!dataCandidate || typeof dataCandidate !== 'object') {
            return {
                ok: false,
                reason: 'data object is required',
                eventId,
                eventType,
                eventVersion,
                externalId,
            };
        }

        if (!externalId) {
            return {
                ok: false,
                reason: 'data.externalId is required',
                eventId,
                eventType,
                eventVersion,
            };
        }

        if (!this.isIsoDateTime(dataCandidate.updatedAt)) {
            return {
                ok: false,
                reason: 'data.updatedAt must be valid date-time',
                eventId,
                eventType,
                eventVersion,
                externalId,
            };
        }

        const event: ImageUpdatedEventV1 = {
            eventId,
            eventType,
            eventVersion: Number(envelope.eventVersion),
            occurredAt: String(envelope.occurredAt),
            data: {
                externalId,
                entityType:
                    typeof dataCandidate.entityType === 'string' || dataCandidate.entityType === null
                        ? (dataCandidate.entityType as string | null)
                        : null,
                entityId:
                    typeof dataCandidate.entityId === 'string' || dataCandidate.entityId === null
                        ? (dataCandidate.entityId as string | null)
                        : null,
                previousImageType:
                    typeof dataCandidate.previousImageType === 'string' ||
                    dataCandidate.previousImageType === null
                        ? (dataCandidate.previousImageType as string | null)
                        : null,
                imageType:
                    typeof dataCandidate.imageType === 'string' || dataCandidate.imageType === null
                        ? (dataCandidate.imageType as string | null)
                        : null,
                updatedAt: String(dataCandidate.updatedAt),
            },
        };

        return { ok: true, event };
    }

    private extractPayloadValue(payload: unknown): unknown {
        const maybeValue = (payload as { value?: unknown })?.value;
        return maybeValue ?? payload;
    }

    private parseObject(source: unknown): Record<string, unknown> | null {
        if (Buffer.isBuffer(source)) {
            return this.parseObject(source.toString('utf-8'));
        }

        if (typeof source === 'string') {
            try {
                const parsed = JSON.parse(source) as unknown;
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return null;
                }

                return parsed as Record<string, unknown>;
            } catch {
                return null;
            }
        }

        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }

        return source as Record<string, unknown>;
    }

    private isIsoDateTime(value: unknown): boolean {
        if (typeof value !== 'string') {
            return false;
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime());
    }

    private parseCommonEventData(data: ImageEventData): { entityId: number; entityType: string; externalId: string; type: string } | null {
        const externalId = data.externalId?.trim();

        if (!externalId || !data.entityId || !data.entityType) {
            this.logger.warn('Skipped event without required data.externalId/entityId/entityType');
            return null;
        }

        const entityId = Number(data.entityId);
        if (!Number.isInteger(entityId)) {
            this.logger.warn(`Skipped event with invalid entityId=${data.entityId}`);
            return null;
        }

        return {
            entityId,
            entityType: data.entityType,
            externalId,
            type: data.imageType || 'default',
        };
    }

    private async saveProductImage(productId: number, url: string, type: string): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            this.logger.warn(`Product ${productId} not found, image is not stored`);
            return;
        }

        const exists = await this.prisma.productImage.findFirst({
            where: { productId, url, type },
            select: { id: true },
        });

        if (exists) {
            return;
        }

        await this.prisma.productImage.create({
            data: {
                productId,
                url,
                type,
                sortOrder: 0,
            },
        });
    }

    private async saveCategoryImage(categoryId: number, url: string, type: string): Promise<void> {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true },
        });

        if (!category) {
            this.logger.warn(`Category ${categoryId} not found, image is not stored`);
            return;
        }

        const exists = await this.prisma.categoryImage.findFirst({
            where: { categoryId, url, type },
            select: { id: true },
        });

        if (exists) {
            return;
        }

        await this.prisma.categoryImage.create({
            data: {
                categoryId,
                url,
                type,
                sortOrder: 0,
            },
        });
    }

    private async deleteProductImage(productId: number, url: string, type: string): Promise<void> {
        const deletedByType = await this.prisma.productImage.deleteMany({
            where: {
                productId,
                url,
                type,
            },
        });

        if (deletedByType.count > 0) {
            return;
        }

        await this.prisma.productImage.deleteMany({
            where: {
                productId,
                url,
            },
        });
    }

    private async deleteCategoryImage(categoryId: number, url: string, type: string): Promise<void> {
        const deletedByType = await this.prisma.categoryImage.deleteMany({
            where: {
                categoryId,
                url,
                type,
            },
        });

        if (deletedByType.count > 0) {
            return;
        }

        await this.prisma.categoryImage.deleteMany({
            where: {
                categoryId,
                url,
            },
        });
    }
}
