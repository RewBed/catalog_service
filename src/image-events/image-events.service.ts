import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

export type ImageUploadedEvent = {
    data: {
        path: string;
        externalId?: string;
        entityId: string;
        entityType: string;
        imageType?: string;
    };
    eventType: string;
};

@Injectable()
export class ImageEventsService {
    private readonly logger = new Logger(ImageEventsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async handleImageUploaded(event: ImageUploadedEvent): Promise<void> {
        const { data } = event;

        // В каталоге храним внешний идентификатор файла, а не путь в файловой системе image-service.
        const externalId = data.externalId?.trim();

        if (!externalId || !data.entityId || !data.entityType) {
            this.logger.warn('Пропущено событие без обязательных полей data.externalId/entityId/entityType');
            return;
        }

        const entityId = Number(data.entityId);
        if (!Number.isInteger(entityId)) {
            this.logger.warn(`Пропущено событие с некорректным entityId=${data.entityId}`);
            return;
        }

        const type = data.imageType || 'default';

        if (data.entityType === 'catalog.product') {
            await this.saveProductImage(entityId, externalId, type);
            return;
        }

        if (data.entityType === 'catalog.category') {
            await this.saveCategoryImage(entityId, externalId, type);
            return;
        }

        this.logger.warn(`Пропущено событие с неподдерживаемым entityType=${data.entityType}`);
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
}
