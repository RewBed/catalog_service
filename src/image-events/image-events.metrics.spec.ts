import { ImageEventsMetrics } from './image-events.metrics';

describe('ImageEventsMetrics', () => {
  it('tracks consumed/failed/deduplicated counters and consumer lag', () => {
    const metrics = new ImageEventsMetrics();

    metrics.incrementConsumed();
    metrics.incrementConsumed();
    metrics.incrementFailed();
    metrics.incrementDeduplicated();
    metrics.setConsumerLag(17);

    expect(metrics.snapshot()).toEqual({
      events_consumed_total: 2,
      events_failed_total: 1,
      events_deduplicated_total: 1,
      consumer_lag: 17,
    });
  });
});
