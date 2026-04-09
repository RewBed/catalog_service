jest.mock('../core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { HttpException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok for liveness probe', () => {
    const controller = new HealthController({} as any);

    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('returns ok for readiness probe when db is reachable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const controller = new HealthController(prisma as any);

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
  });

  it('returns service unavailable when db query fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const controller = new HealthController(prisma as any);

    await expect(controller.ready()).rejects.toBeInstanceOf(HttpException);
  });

  it('echoes payload in health create endpoint', () => {
    const controller = new HealthController({} as any);

    expect(controller.create({ test: 'hello' } as any)).toEqual({ dtoStr: 'hello' });
  });
});
