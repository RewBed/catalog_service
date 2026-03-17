import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { ImageEventBindingsService } from './image-event-bindings.service';

export type ImageEventData = {
    path?: string;
    externalId?: string;
    entityId: string;
    entityType?: string;
    imageType?: string;
    title?: string | null;
    description?: string | null;
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
        previousTitle?: string | null;
        title?: string | null;
        previousDescription?: string | null;
        description?: string | null;
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

type ParsedCommonEventData = {
    entityId: number;
    entityType: string;
    externalId: string;
    type: string;
    title: string | null;
    description: string | null;
};

type ParsedUpdatedEventData = {
    entityId: number;
    entityType: string;
    externalId: string;
    type: string;
    title?: string | null;
    description?: string | null;
    updatedAt: Date;
};

type EntityUpdateStats = {
    updatedRecords: number;
    totalFound: number;
    staleSkips: number;
};

type ImageEntityHandler = {
    upload: (data: ParsedCommonEventData) => Promise<void>;
    delete: (data: ParsedCommonEventData) => Promise<void>;
    update: (
        tx: Prisma.TransactionClient,
        data: ParsedUpdatedEventData,
    ) => Promise<EntityUpdateStats>;
};

@Injectable()
export class ImageEventsService {
    private readonly logger = new Logger(ImageEventsService.name);

    private readonly entityHandlers: Record<string, ImageEntityHandler> = {
        'catalog.product': {
            upload: (data) => this.saveProductImage(data),
            delete: (data) => this.deleteProductImage(data),
            update: (tx, data) => this.updateProductImages(tx, data),
        },
        'catalog.category': {
            upload: (data) => this.saveCategoryImage(data),
            delete: (data) => this.deleteCategoryImage(data),
            update: (tx, data) => this.updateCategoryImages(tx, data),
        },
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly bindingsService: ImageEventBindingsService,
    ) {}

    async handleImageUploaded(sourceTopic: string, event: ImageUploadedEvent): Promise<void> {
        const parsed = this.parseCommonEventData(sourceTopic, event.data);
        if (!parsed) {
            return;
        }

        const handler = this.getEntityHandler(parsed.entityType);
        if (!handler) {
            this.logger.warn(`Skipped event with unsupported entityType=${parsed.entityType}`);
            return;
        }

        await handler.upload(parsed);
    }

    async handleImageDeleted(sourceTopic: string, event: ImageDeletedEvent): Promise<void> {
        const parsed = this.parseCommonEventData(sourceTopic, event.data);
        if (!parsed) {
            return;
        }

        const handler = this.getEntityHandler(parsed.entityType);
        if (!handler) {
            this.logger.warn(`Skipped event with unsupported entityType=${parsed.entityType}`);
            return;
        }

        await handler.delete(parsed);
    }

    async processImageUpdated(sourceTopic: string, payload: unknown): Promise<ImageUpdatedProcessResult> {
        const parsed = this.parseImageUpdatedPayload(payload);

        if (!parsed.ok) {
            if (parsed.eventId) {
                try {
                    await this.registerInboxEvent(
                        parsed.eventId,
                        sourceTopic,
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

        if (!this.matchesUpdatedEventType(event.eventType)) {
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

        const parsedData = this.parseUpdatedEventData(sourceTopic, event.data);
        if (!parsedData.ok) {
            return {
                status: 'invalid',
                eventId: event.eventId,
                externalId: event.data.externalId,
                eventType: event.eventType,
                reason: parsedData.reason,
            };
        }

        const handler = this.getEntityHandler(parsedData.data.entityType);
        if (!handler) {
            return {
                status: 'ignored',
                eventId: event.eventId,
                externalId: parsedData.data.externalId,
                eventType: event.eventType,
                reason: `Unsupported entityType=${parsedData.data.entityType}`,
            };
        }

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

                const updateStats = await handler.update(tx, parsedData.data);

                await tx.$executeRaw`
                    INSERT INTO "InboxEvent" ("eventId", "topic", "eventType", "eventVersion", "externalId")
                    VALUES (${event.eventId}, ${sourceTopic}, ${event.eventType}, ${event.eventVersion}, ${parsedData.data.externalId})
                `;

                if (
                    updateStats.updatedRecords === 0 &&
                    updateStats.totalFound > 0 &&
                    updateStats.staleSkips > 0
                ) {
                    return {
                        status: 'stale' as const,
                        updatedRecords: 0,
                    };
                }

                return {
                    status: 'processed' as const,
                    updatedRecords: updateStats.updatedRecords,
                };
            });

            return {
                ...transactionResult,
                eventId: event.eventId,
                externalId: parsedData.data.externalId,
                eventType: event.eventType,
            };
        } catch (error) {
            if (this.isPrismaUniqueViolation(error)) {
                return {
                    status: 'duplicate',
                    eventId: event.eventId,
                    externalId: parsedData.data.externalId,
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

    private matchesUpdatedEventType(eventType: string): boolean {
        return eventType === 'image.updated' || eventType.endsWith('.image.updated');
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
                previousTitle: this.parseNullableStringField(dataCandidate, 'previousTitle'),
                title: this.parseNullableStringField(dataCandidate, 'title'),
                previousDescription: this.parseNullableStringField(
                    dataCandidate,
                    'previousDescription',
                ),
                description: this.parseNullableStringField(dataCandidate, 'description'),
                updatedAt: String(dataCandidate.updatedAt),
            },
        };

        return { ok: true, event };
    }

    private parseUpdatedEventData(
        sourceTopic: string,
        data: ImageUpdatedEventV1['data'],
    ): { ok: true; data: ParsedUpdatedEventData } | { ok: false; reason: string } {
        const entityTypeResolution = this.bindingsService.resolveEntityType(
            sourceTopic,
            data.entityType,
        );
        if (!entityTypeResolution.entityType) {
            return { ok: false, reason: entityTypeResolution.reason || 'entityType is required' };
        }

        const entityId = this.parseIntegerId(data.entityId);
        if (entityId === null) {
            return {
                ok: false,
                reason: 'data.entityId must be integer',
            };
        }

        return {
            ok: true,
            data: {
                entityId,
                entityType: entityTypeResolution.entityType,
                externalId: data.externalId.trim(),
                type: data.imageType?.trim() || 'default',
                title: this.normalizeOptionalNullableText(data.title),
                description: this.normalizeOptionalNullableText(data.description),
                updatedAt: new Date(data.updatedAt),
            },
        };
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

    private parseNullableStringField(
        source: Record<string, unknown>,
        fieldName: string,
    ): string | null | undefined {
        if (!Object.prototype.hasOwnProperty.call(source, fieldName)) {
            return undefined;
        }

        const value = source[fieldName];
        if (value === null) {
            return null;
        }

        if (typeof value !== 'string') {
            return undefined;
        }

        const normalized = value.trim();
        return normalized || null;
    }

    private isIsoDateTime(value: unknown): boolean {
        if (typeof value !== 'string') {
            return false;
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime());
    }

    private normalizeNullableText(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim();
        return normalized || null;
    }

    private normalizeOptionalNullableText(value: string | null | undefined): string | null | undefined {
        if (value === undefined) {
            return undefined;
        }

        if (value === null) {
            return null;
        }

        const normalized = value.trim();
        return normalized || null;
    }

    private parseCommonEventData(
        sourceTopic: string,
        data: ImageEventData,
    ): ParsedCommonEventData | null {
        const externalId = data.externalId?.trim();

        if (!externalId || !data.entityId) {
            this.logger.warn('Skipped event without required data.externalId/entityId');
            return null;
        }

        const entityTypeResolution = this.bindingsService.resolveEntityType(
            sourceTopic,
            data.entityType,
        );
        if (!entityTypeResolution.entityType) {
            this.logger.warn(entityTypeResolution.reason || 'entityType is required');
            return null;
        }

        const entityId = this.parseIntegerId(data.entityId);
        if (entityId === null) {
            this.logger.warn(`Skipped event with invalid entityId=${data.entityId}`);
            return null;
        }

        return {
            entityId,
            entityType: entityTypeResolution.entityType,
            externalId,
            type: data.imageType?.trim() || 'default',
            title: this.normalizeNullableText(data.title),
            description: this.normalizeNullableText(data.description),
        };
    }

    private parseIntegerId(value: string | null | undefined): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);
        return Number.isInteger(parsed) ? parsed : null;
    }

    private getEntityHandler(entityType: string): ImageEntityHandler | undefined {
        return this.entityHandlers[entityType];
    }

    private async saveProductImage(data: ParsedCommonEventData): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id: data.entityId },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            this.logger.warn(`Product ${data.entityId} not found, image is not stored`);
            return;
        }

        const existingImage = await this.prisma.productImage.findFirst({
            where: {
                productId: data.entityId,
                url: data.externalId,
                type: data.type,
            },
            select: {
                id: true,
                title: true,
                description: true,
            },
        });

        if (existingImage) {
            if (
                existingImage.title !== data.title ||
                existingImage.description !== data.description
            ) {
                await this.prisma.productImage.update({
                    where: { id: existingImage.id },
                    data: {
                        title: data.title,
                        description: data.description,
                    },
                });
            }

            return;
        }

        await this.prisma.productImage.create({
            data: {
                productId: data.entityId,
                url: data.externalId,
                type: data.type,
                title: data.title,
                description: data.description,
                sortOrder: 0,
            },
        });
    }

    private async saveCategoryImage(data: ParsedCommonEventData): Promise<void> {
        const category = await this.prisma.category.findUnique({
            where: { id: data.entityId },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!category || category.deletedAt) {
            this.logger.warn(`Category ${data.entityId} not found, image is not stored`);
            return;
        }

        const existingImage = await this.prisma.categoryImage.findFirst({
            where: {
                categoryId: data.entityId,
                url: data.externalId,
                type: data.type,
            },
            select: {
                id: true,
                title: true,
                description: true,
            },
        });

        if (existingImage) {
            if (
                existingImage.title !== data.title ||
                existingImage.description !== data.description
            ) {
                await this.prisma.categoryImage.update({
                    where: { id: existingImage.id },
                    data: {
                        title: data.title,
                        description: data.description,
                    },
                });
            }

            return;
        }

        await this.prisma.categoryImage.create({
            data: {
                categoryId: data.entityId,
                url: data.externalId,
                type: data.type,
                title: data.title,
                description: data.description,
                sortOrder: 0,
            },
        });
    }

    private async updateProductImages(
        tx: Prisma.TransactionClient,
        data: ParsedUpdatedEventData,
    ): Promise<EntityUpdateStats> {
        const images = await tx.productImage.findMany({
            where: {
                productId: data.entityId,
                url: data.externalId,
            },
            select: {
                id: true,
                updatedAt: true,
            },
        });

        return this.applyImageUpdates(
            images,
            data,
            (id, updateData) =>
                tx.productImage.update({
                    where: { id },
                    data: updateData,
                }),
        );
    }

    private async updateCategoryImages(
        tx: Prisma.TransactionClient,
        data: ParsedUpdatedEventData,
    ): Promise<EntityUpdateStats> {
        const images = await tx.categoryImage.findMany({
            where: {
                categoryId: data.entityId,
                url: data.externalId,
            },
            select: {
                id: true,
                updatedAt: true,
            },
        });

        return this.applyImageUpdates(
            images,
            data,
            (id, updateData) =>
                tx.categoryImage.update({
                    where: { id },
                    data: updateData,
                }),
        );
    }

    private async applyImageUpdates(
        images: Array<{ id: number; updatedAt: Date }>,
        data: ParsedUpdatedEventData,
        updateRow: (
            id: number,
            updateData: { type: string; title?: string | null; description?: string | null },
        ) => Promise<unknown>,
    ): Promise<EntityUpdateStats> {
        let updatedRecords = 0;
        let staleSkips = 0;

        for (const image of images) {
            if (data.updatedAt <= image.updatedAt) {
                staleSkips += 1;
                continue;
            }

            const updateData: { type: string; title?: string | null; description?: string | null } = {
                type: data.type,
            };
            if (data.title !== undefined) {
                updateData.title = data.title;
            }
            if (data.description !== undefined) {
                updateData.description = data.description;
            }

            await updateRow(image.id, updateData);
            updatedRecords += 1;
        }

        return {
            updatedRecords,
            staleSkips,
            totalFound: images.length,
        };
    }

    private async deleteProductImage(data: ParsedCommonEventData): Promise<void> {
        const deletedByType = await this.prisma.productImage.deleteMany({
            where: {
                productId: data.entityId,
                url: data.externalId,
                type: data.type,
            },
        });

        if (deletedByType.count > 0) {
            return;
        }

        await this.prisma.productImage.deleteMany({
            where: {
                productId: data.entityId,
                url: data.externalId,
            },
        });
    }

    private async deleteCategoryImage(data: ParsedCommonEventData): Promise<void> {
        const deletedByType = await this.prisma.categoryImage.deleteMany({
            where: {
                categoryId: data.entityId,
                url: data.externalId,
                type: data.type,
            },
        });

        if (deletedByType.count > 0) {
            return;
        }

        await this.prisma.categoryImage.deleteMany({
            where: {
                categoryId: data.entityId,
                url: data.externalId,
            },
        });
    }
}
