// src/core/database/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy
{
    private readonly pool: Pool;

    constructor(private readonly configService: ConfigService) {
        const connectionString = `postgresql://${configService.get<string>('POSTGRES_USER')}:${configService.get<string>('POSTGRES_PASSWORD')}@${configService.get<string>('POSTGRES_HOST')}:${configService.get<string>('POSTGRES_PORT')}/${configService.get<string>('POSTGRES_DB')}`;

        const pool = new Pool({
            connectionString,
        });

        super({
            adapter: new PrismaPg(pool),
            log: ['error', 'warn'],
        });

        this.pool = pool;
    }

    async onModuleInit() {

    }

    async onModuleDestroy() {
        // Закрываем только пул
        // await this.pool.end();
    }
}
