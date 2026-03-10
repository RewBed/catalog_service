import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageEventsMetrics {
    private eventsConsumedTotal = 0;
    private eventsFailedTotal = 0;
    private eventsDeduplicatedTotal = 0;
    private consumerLag = 0;

    incrementConsumed(): void {
        this.eventsConsumedTotal += 1;
    }

    incrementFailed(): void {
        this.eventsFailedTotal += 1;
    }

    incrementDeduplicated(): void {
        this.eventsDeduplicatedTotal += 1;
    }

    setConsumerLag(value: number): void {
        this.consumerLag = value;
    }

    snapshot(): {
        events_consumed_total: number;
        events_failed_total: number;
        events_deduplicated_total: number;
        consumer_lag: number;
    } {
        return {
            events_consumed_total: this.eventsConsumedTotal,
            events_failed_total: this.eventsFailedTotal,
            events_deduplicated_total: this.eventsDeduplicatedTotal,
            consumer_lag: this.consumerLag,
        };
    }
}
