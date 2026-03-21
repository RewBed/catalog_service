// src/core/database/prisma.service.ts

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

type PrismaLogEvent = {
  timestamp: Date;
  message: string;
  target: string;
};

type PrismaLogEmitter = {
  $on(
    eventType: 'warn' | 'error',
    callback: (event: PrismaLogEvent) => void,
  ): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const connectionString = `postgresql://${configService.get<string>('POSTGRES_USER')}:${configService.get<string>('POSTGRES_PASSWORD')}@${configService.get<string>('POSTGRES_HOST')}:${configService.get<string>('POSTGRES_PORT')}/${configService.get<string>('POSTGRES_DB')}`;

    const pool = new Pool({
      connectionString,
    });

    super({
      adapter: new PrismaPg(pool),
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.pool = pool;
    this.registerLogHandlers();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private registerLogHandlers(): void {
    const emitter = this as unknown as PrismaLogEmitter;

    emitter.$on('warn', (event) => {
      this.logger.warn(
        {
          target: event.target,
          timestamp: event.timestamp.toISOString(),
        },
        event.message,
      );
    });

    emitter.$on('error', (event) => {
      this.logger.error(
        {
          target: event.target,
          timestamp: event.timestamp.toISOString(),
        },
        event.message,
      );
    });
  }
}
