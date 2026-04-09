import { HealthGrpcController } from './health.grpc.controller';

describe('HealthGrpcController', () => {
  it('returns grpc health check payload', () => {
    const controller = new HealthGrpcController();

    expect(controller.check()).toEqual({ ok: true });
  });
});
