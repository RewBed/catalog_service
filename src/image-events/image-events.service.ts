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

        this.logger.warn(`Пропущено событие с неподдерживаемым entityType=${entityType}`);
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

        this.logger.warn(`Пропущено событие с неподдерживаемым entityType=${entityType}`);
    }

    private parseCommonEventData(data: ImageEventData): { entityId: number; entityType: string; externalId: string; type: string } | null {
        // В каталоге храним внешний идентификатор файла, а не путь в файловой системе image-service.
        const externalId = data.externalId?.trim();

        if (!externalId || !data.entityId || !data.entityType) {
            this.logger.warn('Пропущено событие без обязательных полей data.externalId/entityId/entityType');
            return null;
        }

        const entityId = Number(data.entityId);
        if (!Number.isInteger(entityId)) {
            this.logger.warn(`Пропущено событие с некорректным entityId=${data.entityId}`);
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
            select: { id: true },
        });

        if (!product) {
            this.logger.warn(`Товар ${productId} не найден, изображение не сохранено`);
            return;
        }

        // Простая идемпотентность: не создаем повтор при одинаковых productId + url + type.
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
            this.logger.warn(`Категория ${categoryId} не найдена, изображение не сохранено`);
            return;
        }

        // Простая идемпотентность: не создаем повтор при одинаковых categoryId + url + type.
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
        // При удалении сначала пытаемся удалить точное совпадение по типу.
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

        // Фолбэк: если тип в событии не совпал, удаляем по productId + url.
        await this.prisma.productImage.deleteMany({
            where: {
                productId,
                url,
            },
        });
    }

    private async deleteCategoryImage(categoryId: number, url: string, type: string): Promise<void> {
        // При удалении сначала пытаемся удалить точное совпадение по типу.
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

        // Фолбэк: если тип в событии не совпал, удаляем по categoryId + url.
        await this.prisma.categoryImage.deleteMany({
            where: {
                categoryId,
                url,
            },
        });
    }
}
