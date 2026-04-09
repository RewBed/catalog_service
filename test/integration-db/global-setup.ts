import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { applyIntegrationDbEnv } from './helpers/db-env';

function runMigrations(): void {
  const result = spawnSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  if (result.status !== 0) {
    const spawnError = result.error
      ? ` spawn_error=${result.error.name}:${result.error.message}`
      : '';
    throw new Error(
      `Failed to apply Prisma migrations for integration DB (exit code: ${result.status ?? 'unknown'}).${spawnError}`,
    );
  }
}

async function ensureDatabaseExists(): Promise<void> {
  const config = applyIntegrationDbEnv();
  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    const existing = await adminClient.query<{
      datname: string;
    }>('SELECT datname FROM pg_database WHERE datname = $1', [config.database]);

    if (existing.rowCount && existing.rowCount > 0) {
      return;
    }

    await adminClient.query(`CREATE DATABASE "${config.database}"`);
  } finally {
    await adminClient.end();
  }
}

async function globalSetup(): Promise<void> {
  await ensureDatabaseExists();
  runMigrations();
}

export = globalSetup;
