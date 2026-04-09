import 'dotenv/config';

export type IntegrationDbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function normalizePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureSafeDbName(database: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error(
      `Unsafe integration database name: "${database}". Only [a-zA-Z0-9_] is allowed.`,
    );
  }

  return database;
}

function resolveTestDbName(): string {
  const explicitDb = process.env['TEST_POSTGRES_DB']?.trim();
  if (explicitDb) {
    return ensureSafeDbName(explicitDb);
  }

  const baseDb = process.env['POSTGRES_DB']?.trim() || 'catalog_service';
  const normalizedBase = ensureSafeDbName(baseDb);
  return /test/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}_test`;
}

export function applyIntegrationDbEnv(): IntegrationDbConfig {
  const host =
    process.env['TEST_POSTGRES_HOST']?.trim() ||
    process.env['POSTGRES_HOST']?.trim() ||
    'localhost';
  const port = normalizePort(
    process.env['TEST_POSTGRES_PORT'] || process.env['POSTGRES_PORT'],
    5432,
  );
  const user =
    process.env['TEST_POSTGRES_USER']?.trim() ||
    process.env['POSTGRES_USER']?.trim() ||
    'postgres';
  const password =
    process.env['TEST_POSTGRES_PASSWORD'] ||
    process.env['POSTGRES_PASSWORD'] ||
    '';
  const database = resolveTestDbName();

  process.env['POSTGRES_HOST'] = host;
  process.env['POSTGRES_PORT'] = String(port);
  process.env['POSTGRES_USER'] = user;
  process.env['POSTGRES_PASSWORD'] = password;
  process.env['POSTGRES_DB'] = database;

  return { host, port, user, password, database };
}
