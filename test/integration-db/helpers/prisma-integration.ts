import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from 'generated/prisma/client';
import { applyIntegrationDbEnv, IntegrationDbConfig } from './db-env';

export type IntegrationPrismaContext = {
  prisma: InstanceType<typeof PrismaClient>;
  pool: Pool;
  config: IntegrationDbConfig;
};

export function createIntegrationPrismaContext(): IntegrationPrismaContext {
  const config = applyIntegrationDbEnv();
  const connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  } as any);

  return {
    prisma,
    pool,
    config,
  };
}

export async function truncateAllPublicTables(
  prisma: InstanceType<typeof PrismaClient>,
): Promise<void> {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `)) as Array<{ tablename: string }>;

  if (!rows.length) {
    return;
  }

  const tableList = rows
    .map((row) => `"public"."${row.tablename}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
  );
}
