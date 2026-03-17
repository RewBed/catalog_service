import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EntityTopicBinding = {
    entityType: string;
    topic: string;
};

@Injectable()
export class ImageEventBindingsService {
    private readonly entityTypeToTopic = new Map<string, string>();
    private readonly topicToEntityType = new Map<string, string>();

    constructor(private readonly configService: ConfigService) {
        const bindings = this.parseBindings(
            this.configService.get<string>('KAFKA_IMAGE_EVENT_ENTITY_TOPICS', ''),
        );

        for (const binding of bindings) {
            this.entityTypeToTopic.set(binding.entityType, binding.topic);
            this.topicToEntityType.set(binding.topic, binding.entityType);
        }
    }

    getTopics(): string[] {
        return [...this.topicToEntityType.keys()];
    }

    getEntityTypeByTopic(topic: string): string | undefined {
        return this.topicToEntityType.get(topic.trim());
    }

    getTopicByEntityType(entityType: string): string | undefined {
        return this.entityTypeToTopic.get(entityType.trim());
    }

    resolveEntityType(sourceTopic: string, payloadEntityType?: string | null): {
        entityType?: string;
        reason?: string;
    } {
        const normalizedTopic = sourceTopic.trim();
        const normalizedPayloadEntityType = payloadEntityType?.trim() || undefined;
        const configuredEntityType = this.getEntityTypeByTopic(normalizedTopic);

        if (
            configuredEntityType &&
            normalizedPayloadEntityType &&
            configuredEntityType !== normalizedPayloadEntityType
        ) {
            return {
                reason: `Topic ${normalizedTopic} is configured for ${configuredEntityType}, got ${normalizedPayloadEntityType}`,
            };
        }

        if (normalizedPayloadEntityType) {
            return { entityType: normalizedPayloadEntityType };
        }

        if (configuredEntityType) {
            return { entityType: configuredEntityType };
        }

        return {
            reason: `entityType is required and cannot be inferred from topic=${normalizedTopic}`,
        };
    }

    private parseBindings(rawValue: string): EntityTopicBinding[] {
        const bindings = rawValue
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => {
                const separatorIndex = value.indexOf('=');
                if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
                    throw new Error(
                        `Invalid KAFKA_IMAGE_EVENT_ENTITY_TOPICS entry: ${value}. Expected entityType=topic`,
                    );
                }

                const entityType = value.slice(0, separatorIndex).trim();
                const topic = value.slice(separatorIndex + 1).trim();

                if (!entityType || !topic) {
                    throw new Error(
                        `Invalid KAFKA_IMAGE_EVENT_ENTITY_TOPICS entry: ${value}. Expected entityType=topic`,
                    );
                }

                return { entityType, topic };
            });

        const seenEntityTypes = new Set<string>();
        const seenTopics = new Set<string>();

        for (const binding of bindings) {
            if (seenEntityTypes.has(binding.entityType)) {
                throw new Error(
                    `Duplicate entityType in KAFKA_IMAGE_EVENT_ENTITY_TOPICS: ${binding.entityType}`,
                );
            }

            if (seenTopics.has(binding.topic)) {
                throw new Error(
                    `Duplicate topic in KAFKA_IMAGE_EVENT_ENTITY_TOPICS: ${binding.topic}`,
                );
            }

            seenEntityTypes.add(binding.entityType);
            seenTopics.add(binding.topic);
        }

        return bindings;
    }
}
