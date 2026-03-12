import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import * as readline from 'node:readline';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type OperationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  examples?: Record<string, unknown>;
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  schema?: OpenApiSchema;
};

type OpenApiParameter = {
  $ref?: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  name: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
};

type OpenApiMediaType = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown } | unknown>;
};

type OpenApiRequestBody = {
  $ref?: string;
  content?: Record<string, OpenApiMediaType>;
};

type OpenApiSecurityRequirement = Record<string, string[]>;

type OpenApiOperation = {
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
  security?: OpenApiSecurityRequirement[];
};

type OpenApiPathItem = {
  parameters?: OpenApiParameter[];
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
  security?: OpenApiSecurityRequirement[];
};

type OpenApiDoc = {
  paths: Record<string, OpenApiPathItem>;
  security?: OpenApiSecurityRequirement[];
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    parameters?: Record<string, OpenApiParameter>;
    requestBodies?: Record<string, OpenApiRequestBody>;
  };
};

type CliOptions = {
  baseUrl: string;
  specPath: string;
  token?: string;
  authHeader: string;
  authScheme: string;
  timeoutMs: number;
  reportPath: string;
  htmlReportPath: string;
  failFast: boolean;
};

type RunContext = {
  runTag: string;
  values: Record<string, unknown>;
  idsByResource: Record<string, number[]>;
  slugsByResource: Record<string, string[]>;
  childIdsByParentId: Record<string, number[]>;
  groupIdsByProductId: Record<string, number[]>;
  optionIdsByGroupId: Record<string, number[]>;
};

type ExtractedOperation = {
  index: number;
  method: HttpMethod;
  path: string;
  operationId: string;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, unknown>;
  requiresAuth: boolean;
};

type OperationRunState = {
  operation: ExtractedOperation;
  status: OperationStatus;
  startedAt?: number;
  durationMs?: number;
  httpStatus?: number;
  expectedStatuses?: number[];
  error?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
};

type BuiltRequest = {
  url: string;
  contentType?: string;
  body?: unknown;
  unresolvedPathParams: string[];
  selectedParams: Record<string, unknown>;
};

type ExtractedEntity = {
  entity: Record<string, unknown>;
  resourceHint?: string;
};

const SUPPORTED_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
];

function readDotEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const env: Record<string, string> = {};
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function parseCliArgs(argv: string[]): CliOptions {
  const dotenv = readDotEnv(resolve(process.cwd(), '.env'));
  const defaultPort = dotenv.SERVICE_PORT || process.env.SERVICE_PORT || '3000';
  const defaultReportPath = 'reports/http-smoke-generic-latest.json';
  const defaultHtmlReportPath = 'reports/http-smoke-generic-latest.html';

  const options: CliOptions = {
    baseUrl: `http://localhost:${defaultPort}`,
    specPath: 'openapi.json',
    token: process.env.AUTH_TOKEN || process.env.API_TOKEN,
    authHeader: 'Authorization',
    authScheme: 'Bearer',
    timeoutMs: 15000,
    reportPath: defaultReportPath,
    htmlReportPath: defaultHtmlReportPath,
    failFast: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }

    const [rawKey, rawInlineValue] = arg.split('=');
    const key = rawKey.trim();
    const hasInlineValue = rawInlineValue !== undefined;
    const value = hasInlineValue ? rawInlineValue : argv[i + 1];

    if (key === '--base-url') {
      options.baseUrl = ensureHttpBaseUrl(value);
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--spec') {
      options.specPath = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--token' || key === '-t') {
      options.token = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--auth-header') {
      options.authHeader = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--auth-scheme') {
      options.authScheme = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--timeout-ms') {
      options.timeoutMs = Number(value);
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--report') {
      options.reportPath = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--html-report') {
      options.htmlReportPath = value;
      if (!hasInlineValue) i += 1;
      continue;
    }

    if (key === '--fail-fast') {
      options.failFast = true;
      continue;
    }

    if (key.startsWith('--')) {
      throw new Error(`Unknown argument: ${key}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error('--timeout-ms must be a positive number');
  }

  if (
    options.reportPath !== defaultReportPath &&
    options.htmlReportPath === defaultHtmlReportPath
  ) {
    options.htmlReportPath = options.reportPath.endsWith('.json')
      ? `${options.reportPath.slice(0, -5)}.html`
      : `${options.reportPath}.html`;
  }

  return options;
}

function printHelpAndExit(): never {
  // eslint-disable-next-line no-console
  console.log(`
OpenAPI HTTP smoke runner (generic)

Usage:
  npm run http:smoke:generic -- --base-url http://localhost:3002 --token <JWT>

Options:
  --base-url <url>        Base URL for API requests (default from .env SERVICE_PORT)
  --spec <path>           Path to OpenAPI file (default: openapi.json)
  --token, -t <token>     Auth token value
  --auth-header <name>    Header name for token (default: Authorization)
  --auth-scheme <scheme>  Prefix for token value (default: Bearer)
  --timeout-ms <number>   Request timeout in milliseconds (default: 15000)
  --report <path>         JSON report path (default: reports/http-smoke-generic-latest.json)
  --html-report <path>    HTML report path (default: reports/http-smoke-generic-latest.html)
  --fail-fast             Stop on first failed request
  --help, -h              Show this help
`);
  process.exit(0);
}

function ensureHttpBaseUrl(value: string): string {
  if (!value) {
    throw new Error('--base-url requires value');
  }
  const normalized = value.endsWith('/') ? value : `${value}/`;
  const parsed = new URL(normalized);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('--base-url must be http:// or https://');
  }
  return parsed.toString();
}

function readSpec(specPath: string): OpenApiDoc {
  const absoluteSpecPath = resolve(process.cwd(), specPath);
  const raw = readFileSync(absoluteSpecPath, 'utf8');
  return JSON.parse(raw) as OpenApiDoc;
}

function deepClone<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveRef(doc: OpenApiDoc, ref?: string): unknown {
  if (!ref || !ref.startsWith('#/')) {
    return undefined;
  }

  let cursor: unknown = doc;
  const pathParts = ref.slice(2).split('/').map(decodeURIComponent);

  for (const part of pathParts) {
    if (typeof cursor !== 'object' || cursor === null) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return cursor;
}

function firstExampleFromExamples(
  examples: Record<string, unknown> | undefined,
): unknown {
  if (!examples || typeof examples !== 'object') {
    return undefined;
  }

  const firstKey = Object.keys(examples)[0];
  if (!firstKey) {
    return undefined;
  }

  const first = examples[firstKey] as { value?: unknown } | unknown;
  if (typeof first === 'object' && first !== null && 'value' in first) {
    return deepClone((first as { value?: unknown }).value);
  }

  return deepClone(first);
}

function fallbackByType(
  schema: OpenApiSchema | undefined,
  nameHint?: string,
): unknown {
  const lowerName = (nameHint || '').toLowerCase();

  if (lowerName.includes('slug')) return 'example-slug';
  if (lowerName.includes('name')) return 'example-name';
  if (lowerName.includes('description')) return 'example description';
  if (lowerName.endsWith('id') || lowerName === 'id') return 1;
  if (lowerName === 'page') return 1;
  if (lowerName === 'limit') return 25;

  if (!schema) return undefined;
  if (schema.type === 'boolean') return true;
  if (schema.type === 'integer' || schema.type === 'number') return 1;
  if (schema.type === 'string') {
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'date') return new Date().toISOString().slice(0, 10);
    return 'example';
  }
  if (schema.type === 'array') return [];
  if (schema.type === 'object') return {};

  return undefined;
}

function buildExampleFromSchema(
  schema: OpenApiSchema | undefined,
  doc: OpenApiDoc,
): unknown {
  if (!schema) return undefined;

  if (schema.$ref) {
    const resolved = resolveRef(doc, schema.$ref) as OpenApiSchema | undefined;
    return buildExampleFromSchema(resolved, doc);
  }

  if (schema.example !== undefined) {
    return deepClone(schema.example);
  }

  const fromExamples = firstExampleFromExamples(schema.examples);
  if (fromExamples !== undefined) {
    return fromExamples;
  }

  if (schema.default !== undefined) {
    return deepClone(schema.default);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return deepClone(schema.enum[0]);
  }

  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema.properties || {})) {
      const value = buildExampleFromSchema(child, doc);
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  if (schema.type === 'array') {
    const item = buildExampleFromSchema(schema.items, doc);
    if (item === undefined) {
      return [];
    }
    return [item];
  }

  return fallbackByType(schema);
}

function buildExampleFromMedia(
  media: OpenApiMediaType | undefined,
  doc: OpenApiDoc,
): unknown {
  if (!media) {
    return undefined;
  }

  if (media.example !== undefined) {
    return deepClone(media.example);
  }

  const fromExamples = firstExampleFromExamples(
    media.examples as Record<string, unknown> | undefined,
  );
  if (fromExamples !== undefined) {
    return fromExamples;
  }

  return buildExampleFromSchema(media.schema, doc);
}

function applyContextToPayload(value: unknown, context: RunContext): unknown {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => applyContextToPayload(item, context))
      .filter((item) => item !== undefined);
    return normalized;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      const canUseContext =
        (lowerKey.endsWith('id') && lowerKey !== 'id') ||
        lowerKey.endsWith('ids') ||
        lowerKey.includes('slug');

      const contextual = canUseContext
        ? contextValueForParam(key, '/context-body', context)
        : undefined;

      if (contextual !== undefined) {
        out[key] = contextual;
      } else {
        // Prevent dangling relation ids from examples when there is no context yet.
        if (
          lowerKey !== 'id' &&
          lowerKey.endsWith('id') &&
          typeof item === 'number'
        ) {
          continue;
        }

        if (
          lowerKey.endsWith('ids') &&
          Array.isArray(item) &&
          item.every((nested) => typeof nested === 'number')
        ) {
          continue;
        }

        const normalized = applyContextToPayload(item, context);
        if (normalized !== undefined) {
          out[key] = normalized;
        }
      }
    }

    return out;
  }

  return value;
}

function dedupeParameters(parameters: OpenApiParameter[]): OpenApiParameter[] {
  const map = new Map<string, OpenApiParameter>();
  for (const parameter of parameters) {
    const key = `${parameter.in}:${parameter.name}`;
    map.set(key, parameter);
  }
  return [...map.values()];
}

function hasSecurityRequirements(
  security: OpenApiSecurityRequirement[] | undefined,
): boolean {
  if (!Array.isArray(security) || security.length === 0) {
    return false;
  }

  return security.some(
    (entry) => entry && typeof entry === 'object' && Object.keys(entry).length > 0,
  );
}

function pathParamCount(path: string): number {
  return (path.match(/\{[^}]+\}/g) || []).length;
}

function splitPathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function normalizeResourceKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function singularizeWord(word: string): string {
  if (/(ches|shes|xes|zes)$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('ses')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

function pluralizeWord(word: string): string {
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (word.endsWith('s')) {
    return word;
  }
  return `${word}s`;
}

function singularizeResource(resource: string): string {
  const normalized = normalizeResourceKey(resource);
  if (!normalized) {
    return normalized;
  }

  const parts = normalized.split('-');
  const last = parts[parts.length - 1] || '';
  parts[parts.length - 1] = singularizeWord(last);
  return parts.join('-');
}

function pluralizeResource(resource: string): string {
  const normalized = normalizeResourceKey(resource);
  if (!normalized) {
    return normalized;
  }

  const parts = normalized.split('-');
  const last = parts[parts.length - 1] || '';
  parts[parts.length - 1] = pluralizeWord(last);
  return parts.join('-');
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function toCamelCaseFromKebab(value: string): string {
  const parts = value.split('-').filter(Boolean);
  if (parts.length === 0) {
    return '';
  }

  return parts
    .map((part, index) =>
      index === 0 ? part : `${part[0]?.toUpperCase() || ''}${part.slice(1)}`,
    )
    .join('');
}

function primaryResourceFromPath(path: string): string {
  const ignored = new Set([
    'api',
    'admin',
    'v1',
    'v2',
    'v3',
    'restore',
    'search',
    'price',
    'count',
    'export',
    'import',
    'bulk',
    'by-slug',
    'by-id',
  ]);

  const segments = splitPathSegments(path).filter(
    (segment) => !segment.startsWith('{'),
  );

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const candidate = normalizeResourceKey(segments[i] || '');
    if (!candidate || ignored.has(candidate)) {
      continue;
    }
    return candidate;
  }

  return 'resource';
}

function resourceCandidatesFromName(name: string): string[] {
  const set = new Set<string>();
  const raw = name.replace(/\[\]$/, '');
  let base = raw;

  if (/Ids?$/.test(base)) {
    base = base.replace(/Ids?$/, '');
  }

  if (!base) {
    return [];
  }

  const kebab = normalizeResourceKey(toKebabCase(base));
  if (kebab) {
    const singular = singularizeResource(kebab);
    const plural = pluralizeResource(kebab);
    set.add(kebab);
    set.add(singular);
    set.add(plural);

    const parts = singular.split('-');
    const last = parts[parts.length - 1];
    if (last) {
      set.add(last);
      set.add(pluralizeWord(last));
    }
  }

  return [...set].filter(Boolean);
}

function latestFromArray<T>(items: T[] | undefined): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  return items[items.length - 1];
}

function latestIdsForCandidates(
  context: RunContext,
  candidates: string[],
): number[] {
  const collected: number[] = [];
  const visited = new Set<number>();

  for (const candidate of candidates) {
    const key = normalizeResourceKey(candidate);
    if (!key) {
      continue;
    }

    const ids = context.idsByResource[key];
    if (!Array.isArray(ids)) {
      continue;
    }

    for (const id of ids) {
      if (typeof id === 'number' && Number.isFinite(id) && !visited.has(id)) {
        visited.add(id);
        collected.push(id);
      }
    }
  }

  return collected;
}

function latestIdForCandidates(
  context: RunContext,
  candidates: string[],
): number | undefined {
  const ids = latestIdsForCandidates(context, candidates);
  return latestFromArray(ids);
}

function latestSlugForCandidates(
  context: RunContext,
  candidates: string[],
): string | undefined {
  for (const candidate of candidates) {
    const key = normalizeResourceKey(candidate);
    if (!key) {
      continue;
    }

    const slugs = context.slugsByResource[key];
    const value = latestFromArray(slugs);
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  return undefined;
}

function extractOperations(doc: OpenApiDoc): ExtractedOperation[] {
  const operations: ExtractedOperation[] = [];
  let index = 1;

  for (const [path, pathItem] of Object.entries(doc.paths || {})) {
    const shared = pathItem.parameters || [];

    for (const method of SUPPORTED_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const parameters = dedupeParameters([
        ...(shared || []),
        ...(operation.parameters || []),
      ]);
      const looksLikeAdminRoute = /\/admin(\/|$)/.test(path);
      const requiresAuth =
        operation.security !== undefined
          ? hasSecurityRequirements(operation.security)
          : pathItem.security !== undefined
            ? hasSecurityRequirements(pathItem.security)
            : doc.security !== undefined
              ? hasSecurityRequirements(doc.security)
              : looksLikeAdminRoute;

      operations.push({
        index,
        method,
        path,
        operationId: operation.operationId || `${method}_${path}`,
        parameters,
        requestBody: operation.requestBody,
        responses: (operation.responses || {}) as Record<string, unknown>,
        requiresAuth,
      });

      index += 1;
    }
  }

  operations.sort((a, b) => {
    const byWeight = operationWeight(a) - operationWeight(b);
    if (byWeight !== 0) return byWeight;
    const byPath = a.path.localeCompare(b.path);
    if (byPath !== 0) return byPath;
    return a.method.localeCompare(b.method);
  });

  operations.forEach((operation, idx) => {
    operation.index = idx + 1;
  });

  return operations;
}

function operationWeight(operation: ExtractedOperation): number {
  const pathParams = pathParamCount(operation.path);
  const healthBoost = operation.path.startsWith('/health') ? -20 : 0;
  const restorePenalty = operation.path.endsWith('/restore') ? 30 : 0;

  if (operation.method === 'post') {
    // Create foundational resources first, then dependent ones.
    if (operation.path === '/api/admin/categories') {
      return 6 + healthBoost;
    }

    if (operation.path === '/api/admin/branches') {
      return 7 + healthBoost;
    }

    if (operation.path === '/api/admin/products') {
      return 8 + healthBoost;
    }

    if (operation.path === '/api/admin/products/{productId}/variant-groups') {
      return 12 + pathParams * 2 + healthBoost;
    }

    if (
      operation.path ===
      '/api/admin/products/{productId}/variant-groups/{groupId}/options'
    ) {
      return 14 + pathParams * 2 + healthBoost;
    }

    if (operation.path === '/api/admin/branch-products') {
      return 16 + healthBoost;
    }

    return 10 + pathParams * 2 + restorePenalty + healthBoost;
  }

  if (operation.method === 'get') {
    const base = pathParams === 0 ? 20 : 25;
    return base + pathParams * 2 + healthBoost;
  }

  if (operation.method === 'patch') {
    return 40 + pathParams * 2 + restorePenalty;
  }

  if (operation.method === 'put') {
    return 45 + pathParams * 2;
  }

  if (operation.method === 'delete') {
    return 50 - pathParams * 2 + restorePenalty;
  }

  return 60 + pathParams * 2;
}

function contextValueForParam(
  name: string,
  path: string,
  context: RunContext,
): unknown {
  if (name !== 'id' && Object.prototype.hasOwnProperty.call(context.values, name)) {
    return deepClone(context.values[name]);
  }

  if (name === 'id') {
    const resource = primaryResourceFromPath(path);
    const id = latestIdForCandidates(context, [
      resource,
      singularizeResource(resource),
      pluralizeResource(resource),
    ]);
    if (id !== undefined) {
      return id;
    }
  }

  const lower = name.toLowerCase();

  if (lower.endsWith('ids')) {
    const candidates = resourceCandidatesFromName(name);
    const ids = latestIdsForCandidates(context, candidates);
    if (ids.length > 0) {
      return ids.slice(Math.max(0, ids.length - 3));
    }

    const singularName = name.slice(0, -1);
    const directValue = context.values[singularName];
    if (typeof directValue === 'number') {
      return [directValue];
    }
  }

  if (lower.endsWith('id')) {
    const candidates = resourceCandidatesFromName(name);
    const id = latestIdForCandidates(context, candidates);
    if (id !== undefined) {
      return id;
    }
  }

  if (lower.includes('slug')) {
    const candidates =
      name === 'slug'
        ? [primaryResourceFromPath(path)]
        : resourceCandidatesFromName(name.replace(/slug/gi, 'Id'));
    const slug = latestSlugForCandidates(context, candidates);
    if (slug) {
      return slug;
    }

    const fallbackSlug = context.values.slug;
    if (typeof fallbackSlug === 'string') {
      return fallbackSlug;
    }
  }

  return undefined;
}

function latestChildIdForParent(
  context: RunContext,
  parentId: number,
): number | undefined {
  if (!Number.isFinite(parentId) || parentId <= 0) {
    return undefined;
  }

  const children = context.childIdsByParentId[String(parentId)] || [];
  const validChildren = children.filter(
    (item) => typeof item === 'number' && Number.isFinite(item) && item > 0,
  );

  return latestFromArray(validChildren);
}

function latestMappedId(
  mapping: Record<string, number[]>,
  parentId: number,
): number | undefined {
  if (!Number.isFinite(parentId) || parentId <= 0) {
    return undefined;
  }

  const children = mapping[String(parentId)] || [];
  const validChildren = children.filter(
    (item) => typeof item === 'number' && Number.isFinite(item) && item > 0,
  );

  return latestFromArray(validChildren);
}

function latestGroupIdForProduct(
  context: RunContext,
  productId: number,
): number | undefined {
  return latestMappedId(context.groupIdsByProductId, productId);
}

function latestOptionIdForGroup(
  context: RunContext,
  groupId: number,
): number | undefined {
  return latestMappedId(context.optionIdsByGroupId, groupId);
}

function resolveParameter(
  parameter: OpenApiParameter,
  doc: OpenApiDoc,
): OpenApiParameter {
  if (!parameter.$ref) return parameter;
  const resolved = resolveRef(doc, parameter.$ref) as
    | OpenApiParameter
    | undefined;
  return resolved || parameter;
}

function resolveRequestBody(
  requestBody: OpenApiRequestBody | undefined,
  doc: OpenApiDoc,
): OpenApiRequestBody | undefined {
  if (!requestBody) return undefined;
  if (!requestBody.$ref) return requestBody;
  const resolved = resolveRef(doc, requestBody.$ref) as
    | OpenApiRequestBody
    | undefined;
  return resolved || requestBody;
}

function buildRequest(
  operation: ExtractedOperation,
  doc: OpenApiDoc,
  baseUrl: string,
  context: RunContext,
): BuiltRequest {
  const pathValues: Record<string, unknown> = {};
  const queryValues: Record<string, unknown> = {};
  const selectedParams: Record<string, unknown> = {};
  const unresolvedPathParams: string[] = [];

  for (const raw of operation.parameters) {
    const parameter = resolveParameter(raw, doc);
    const isOptionalQuery =
      parameter.in === 'query' && parameter.required !== true;
    let value: unknown;

    if (
      parameter.name === 'groupId' &&
      typeof selectedParams.productId === 'number'
    ) {
      value =
        latestGroupIdForProduct(context, selectedParams.productId) ??
        latestChildIdForParent(context, selectedParams.productId);
    }

    if (
      value === undefined &&
      parameter.name === 'optionId' &&
      typeof selectedParams.groupId === 'number'
    ) {
      value =
        latestOptionIdForGroup(context, selectedParams.groupId) ??
        latestChildIdForParent(context, selectedParams.groupId);
    }

    if (value === undefined) {
      value = contextValueForParam(parameter.name, operation.path, context);
    }

    if (value === undefined && isOptionalQuery) {
      const schema = parameter.schema || {};
      const lowerName = parameter.name.toLowerCase();
      const shouldUseOptionalByDefault =
        schema.default !== undefined ||
        lowerName === 'page' ||
        lowerName === 'limit';

      if (!shouldUseOptionalByDefault) {
        continue;
      }
    }

    if (value === undefined && parameter.example !== undefined) {
      value = deepClone(parameter.example);
    }

    if (value === undefined) {
      value = firstExampleFromExamples(
        parameter.examples as Record<string, unknown> | undefined,
      );
    }

    if (value === undefined) {
      value = buildExampleFromSchema(parameter.schema, doc);
    }

    if (
      value === undefined &&
      !(parameter.in === 'path' && parameter.required === true)
    ) {
      value = fallbackByType(parameter.schema, parameter.name);
    }

    if (value === undefined) {
      if (parameter.in === 'path' && parameter.required === true) {
        unresolvedPathParams.push(parameter.name);
      }
      continue;
    }

    selectedParams[parameter.name] = deepClone(value);

    if (parameter.in === 'path') {
      pathValues[parameter.name] = value;
    } else if (parameter.in === 'query') {
      queryValues[parameter.name] = value;
    }
  }

  const resolvedPath = operation.path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathValues[key];
    if (value === undefined || value === null) {
      return encodeURIComponent(`missing-${key}`);
    }
    return encodeURIComponent(String(value));
  });

  const url = new URL(resolvedPath, baseUrl);
  for (const [key, value] of Object.entries(queryValues)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }

  if (
    operation.path === '/api/products/{productId}/variant-groups/price' &&
    typeof selectedParams.productId === 'number'
  ) {
    const groupIds = context.groupIdsByProductId[String(selectedParams.productId)] || [];
    const optionIds = groupIds
      .map((groupId) =>
        typeof groupId === 'number'
          ? latestOptionIdForGroup(context, groupId) ??
            latestChildIdForParent(context, groupId)
          : undefined,
      )
      .filter(
        (optionId): optionId is number =>
          typeof optionId === 'number' &&
          Number.isFinite(optionId) &&
          optionId > 0,
      );

    if (optionIds.length > 0) {
      selectedParams.optionIds = optionIds;
      url.searchParams.delete('optionIds');
      for (const optionId of optionIds) {
        url.searchParams.append('optionIds', String(optionId));
      }
    }
  }

  const requestBody = resolveRequestBody(operation.requestBody, doc);
  if (!requestBody?.content) {
    return {
      url: url.toString(),
      unresolvedPathParams: [...new Set(unresolvedPathParams)],
      selectedParams,
    };
  }

  const contentType = requestBody.content['application/json']
    ? 'application/json'
    : Object.keys(requestBody.content)[0];

  if (!contentType) {
    return {
      url: url.toString(),
      unresolvedPathParams: [...new Set(unresolvedPathParams)],
      selectedParams,
    };
  }

  const media = requestBody.content[contentType];
  let body = buildExampleFromMedia(media, doc);
  body = applyContextToPayload(body, context);

  return {
    url: url.toString(),
    contentType,
    body,
    unresolvedPathParams: [...new Set(unresolvedPathParams)],
    selectedParams,
  };
}

function appendRunTagToSlug(slug: string, runTag: string): string {
  const cleanTag = runTag.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTag) {
    return slug;
  }

  if (slug.endsWith(`-${cleanTag}`)) {
    return slug;
  }

  return `${slug}-${cleanTag}`;
}

function appendRunTagToName(name: string, runTag: string): string {
  const cleanTag = runTag.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTag) {
    return name;
  }

  if (name.endsWith(` ${cleanTag}`) || name.endsWith(`-${cleanTag}`)) {
    return name;
  }

  return `${name} ${cleanTag}`;
}

function createRunTag(): string {
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .padStart(4, '0');
  return `${timestampPart}${randomPart}`;
}

function createOperationTag(runTag: string, operationIndex: number): string {
  return `${runTag}${operationIndex.toString(36)}`;
}

function shouldSuffixStringKey(key: string | undefined): boolean {
  const lowerKey = (key || '').toLowerCase();
  if (!lowerKey) {
    return false;
  }

  return (
    lowerKey === 'name' ||
    lowerKey.endsWith('name') ||
    lowerKey === 'slug' ||
    lowerKey.endsWith('slug') ||
    lowerKey === 'title' ||
    lowerKey.endsWith('title') ||
    lowerKey === 'code' ||
    lowerKey.endsWith('code') ||
    lowerKey === 'sku' ||
    lowerKey.endsWith('sku') ||
    lowerKey.endsWith('key') ||
    lowerKey.endsWith('reference') ||
    lowerKey.endsWith('identifier')
  );
}

function shouldSkipStringSuffix(key: string | undefined, value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  if (!shouldSuffixStringKey(key)) {
    return true;
  }

  const lowerKey = (key || '').toLowerCase();
  const blockedKeys = new Set([
    'email',
    'password',
    'token',
    'authorization',
    'phone',
    'url',
    'image',
    'imageurl',
    'avatar',
  ]);

  if (blockedKeys.has(lowerKey)) {
    return true;
  }

  if (/^https?:\/\//i.test(value)) {
    return true;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }

  if (
    /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      value,
    )
  ) {
    return true;
  }

  return false;
}

function appendRunSuffixToStringValue(value: string, runTag: string): string {
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)) {
    return appendRunTagToSlug(value, runTag);
  }

  return appendRunTagToName(value, runTag);
}

function appendRunSuffixToPayload(
  value: unknown,
  runTag: string,
  keyHint?: string,
): unknown {
  if (typeof value === 'string') {
    if (shouldSkipStringSuffix(keyHint, value)) {
      return value;
    }
    return appendRunSuffixToStringValue(value, runTag);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      appendRunSuffixToPayload(item, `${runTag}${index.toString(36)}`, keyHint),
    );
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = appendRunSuffixToPayload(nested, runTag, key);
    }
    return out;
  }

  return value;
}

function hasEntityIdentifier(value: Record<string, unknown>): boolean {
  const keys = ['name', 'slug', 'title', 'code', 'sku', 'key', 'identifier'];
  return keys.some((key) => {
    const item = value[key];
    return typeof item === 'string' && item.trim().length > 0;
  });
}

function rememberChildId(
  context: RunContext,
  parentId: number,
  childId: number,
): void {
  rememberMappedChildId(context.childIdsByParentId, parentId, childId);
}

function rememberMappedChildId(
  mapping: Record<string, number[]>,
  parentId: number,
  childId: number,
): void {
  if (
    !Number.isFinite(parentId) ||
    !Number.isFinite(childId) ||
    parentId <= 0 ||
    childId <= 0
  ) {
    return;
  }

  const key = String(parentId);
  const ids = mapping[key] || [];
  if (!ids.includes(childId)) {
    ids.push(childId);
  }
  mapping[key] = ids;
}

function rememberVariantGroupRelation(
  context: RunContext,
  productId: number,
  groupId: number,
): void {
  rememberMappedChildId(context.groupIdsByProductId, productId, groupId);
}

function rememberVariantOptionRelation(
  context: RunContext,
  groupId: number,
  optionId: number,
): void {
  rememberMappedChildId(context.optionIdsByGroupId, groupId, optionId);
}

function isVariantGroupResource(resourceHint: string | undefined): boolean {
  const normalized = singularizeResource(normalizeResourceKey(resourceHint || ''));
  return normalized === 'variant-group';
}

function isVariantOptionResource(resourceHint: string | undefined): boolean {
  const normalized = singularizeResource(normalizeResourceKey(resourceHint || ''));
  return normalized === 'option';
}

function normalizeNestedEntityIds(
  value: unknown,
  context: RunContext,
  parentId?: number,
): unknown {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const normalized = normalizeNestedEntityIds(item, context, parentId);
      if (normalized !== undefined) {
        out.push(normalized);
      }
    }
    return out;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const sourceId = typeof source.id === 'number' ? source.id : undefined;
  let resolvedId = sourceId;

  const parentChildren =
    parentId !== undefined ? context.childIdsByParentId[String(parentId)] || [] : [];

  if (
    resolvedId !== undefined &&
    parentChildren.length > 0 &&
    !parentChildren.includes(resolvedId)
  ) {
    if (hasEntityIdentifier(source)) {
      resolvedId = undefined;
    } else {
      resolvedId = parentChildren[parentChildren.length - 1];
    }
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key === 'id') {
      if (resolvedId !== undefined) {
        out.id = resolvedId;
      }
      continue;
    }

    const nextParentId = resolvedId ?? parentId;
    out[key] = normalizeNestedEntityIds(nested, context, nextParentId);
  }

  if (
    parentId !== undefined &&
    sourceId !== undefined &&
    sourceId !== resolvedId &&
    resolvedId === undefined &&
    !hasEntityIdentifier(out)
  ) {
    return undefined;
  }

  return out;
}

function normalizeRequestForOperation(
  operation: ExtractedOperation,
  request: BuiltRequest,
  context: RunContext,
): BuiltRequest {
  const normalized: BuiltRequest = {
    ...request,
    body: deepClone(request.body),
  };

  const isMutationMethod =
    operation.method === 'post' ||
    operation.method === 'patch' ||
    operation.method === 'put';
  if (isMutationMethod) {
    const mutationTag = createOperationTag(context.runTag, operation.index);
    normalized.body = appendRunSuffixToPayload(normalized.body, mutationTag);
    const parentIdHint =
      typeof normalized.selectedParams.productId === 'number'
        ? normalized.selectedParams.productId
        : typeof normalized.selectedParams.id === 'number'
          ? normalized.selectedParams.id
          : undefined;
    normalized.body = normalizeNestedEntityIds(
      normalized.body,
      context,
      parentIdHint,
    );

    if (operation.path === '/api/admin/products/{id}') {
      normalized.body = sanitizeAdminProductPatchPayload(normalized.body);
    }
  }

  return normalized;
}

function sanitizeAdminProductPatchPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.variantGroups)) {
    return body;
  }

  body.variantGroups = body.variantGroups
    .map((group) => {
      if (!group || typeof group !== 'object') {
        return group;
      }

      const outGroup = { ...(group as Record<string, unknown>) };
      const groupName =
        typeof outGroup.name === 'string' ? outGroup.name.trim() : '';
      const creatingGroup = groupName.length > 0;

      if (creatingGroup) {
        delete outGroup.id;
      }

      if (Array.isArray(outGroup.options)) {
        outGroup.options = outGroup.options
          .map((option) => {
            if (!option || typeof option !== 'object') {
              return option;
            }

            const outOption = { ...(option as Record<string, unknown>) };
            const optionName =
              typeof outOption.name === 'string' ? outOption.name.trim() : '';

            if (creatingGroup || optionName.length > 0) {
              delete outOption.id;
            }

            if (optionName.length === 0 && outOption.id === undefined) {
              return undefined;
            }

            return outOption;
          })
          .filter((item) => item !== undefined);
      }

      return outGroup;
    })
    .filter((item) => item !== undefined);

  return body;
}

function expectedSuccessStatuses(responses: Record<string, unknown>): number[] {
  const numericStatuses = Object.keys(responses || {})
    .filter((code) => /^\d{3}$/.test(code))
    .map((code) => Number(code));

  const successStatuses = numericStatuses.filter(
    (status) => status >= 200 && status < 300,
  );
  if (successStatuses.length > 0) {
    return successStatuses;
  }

  return numericStatuses;
}

function parseResponseBody(raw: string): unknown {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function isScalarValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function rememberResourceId(
  context: RunContext,
  resourceHint: string | undefined,
  id: number,
): void {
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }

  const resource = normalizeResourceKey(resourceHint || '');
  if (!resource) {
    context.values.id = id;
    return;
  }

  const ids = context.idsByResource[resource] || [];
  if (!ids.includes(id)) {
    ids.push(id);
  }
  context.idsByResource[resource] = ids;

  const singular = singularizeResource(resource);
  const singularCamel = toCamelCaseFromKebab(singular);
  if (singularCamel) {
    context.values[`${singularCamel}Id`] = id;
  }

  const lastWord = singular.split('-').pop() || '';
  const lastWordCamel = toCamelCaseFromKebab(lastWord);
  if (lastWordCamel && !singular.includes('-')) {
    context.values[`${lastWordCamel}Id`] = id;
  }

  context.values.id = id;
}

function rememberResourceSlug(
  context: RunContext,
  resourceHint: string | undefined,
  slug: string,
): void {
  if (!slug) {
    return;
  }

  const resource = normalizeResourceKey(resourceHint || '');
  if (!resource) {
    context.values.slug = slug;
    return;
  }

  const slugs = context.slugsByResource[resource] || [];
  if (!slugs.includes(slug)) {
    slugs.push(slug);
  }
  context.slugsByResource[resource] = slugs;

  const singular = singularizeResource(resource);
  const singularCamel = toCamelCaseFromKebab(singular);
  if (singularCamel) {
    context.values[`${singularCamel}Slug`] = slug;
  }

  const lastWord = singular.split('-').pop() || '';
  const lastWordCamel = toCamelCaseFromKebab(lastWord);
  if (lastWordCamel && !singular.includes('-')) {
    context.values[`${lastWordCamel}Slug`] = slug;
  }

  context.values.slug = slug;
}

function updateContext(
  context: RunContext,
  operation: ExtractedOperation,
  body: unknown,
  selectedParams: Record<string, unknown>,
): void {
  for (const [name, value] of Object.entries(selectedParams || {})) {
    if (!isScalarValue(value)) {
      continue;
    }

    context.values[name] = value;

    if (typeof value === 'number' && name.toLowerCase().endsWith('id')) {
      const resource = resourceCandidatesFromName(name)[0];
      rememberResourceId(context, resource, value);
    }

    if (typeof value === 'string' && name.toLowerCase().includes('slug')) {
      const resource =
        resourceCandidatesFromName(name.replace(/slug/gi, 'Id'))[0] ||
        primaryResourceFromPath(operation.path);
      rememberResourceSlug(context, resource, value);
    }
  }

  const selectedProductId =
    typeof selectedParams.productId === 'number' ? selectedParams.productId : undefined;
  const selectedGroupId =
    typeof selectedParams.groupId === 'number' ? selectedParams.groupId : undefined;
  const selectedOptionId =
    typeof selectedParams.optionId === 'number' ? selectedParams.optionId : undefined;

  if (selectedProductId !== undefined && selectedGroupId !== undefined) {
    rememberVariantGroupRelation(context, selectedProductId, selectedGroupId);
  }

  if (selectedGroupId !== undefined && selectedOptionId !== undefined) {
    rememberVariantOptionRelation(context, selectedGroupId, selectedOptionId);
  }

  if (body === undefined || body === null) {
    return;
  }

  const rootResource = primaryResourceFromPath(operation.path);
  const entities = extractEntities(body, rootResource);

  for (const { entity, resourceHint } of entities) {
    const entityId =
      typeof entity.id === 'number' && Number.isFinite(entity.id) && entity.id > 0
        ? entity.id
        : undefined;
    const explicitEntityProductId =
      typeof entity.productId === 'number' &&
      Number.isFinite(entity.productId) &&
      entity.productId > 0
        ? entity.productId
        : undefined;
    const explicitEntityGroupId =
      typeof entity.groupId === 'number' &&
      Number.isFinite(entity.groupId) &&
      entity.groupId > 0
        ? entity.groupId
        : undefined;

    const variantPath = operation.path.includes('/variant-groups');
    const variantGroupResource = isVariantGroupResource(resourceHint);
    const variantOptionResource = isVariantOptionResource(resourceHint);
    const relatedProductId =
      explicitEntityProductId !== undefined
        ? explicitEntityProductId
        : variantGroupResource
          ? selectedProductId
          : undefined;
    const relatedGroupId =
      explicitEntityGroupId !== undefined
        ? explicitEntityGroupId
        : variantOptionResource
          ? selectedGroupId
          : undefined;

    if (
      entityId !== undefined &&
      relatedProductId !== undefined &&
      (variantGroupResource || (variantPath && explicitEntityProductId !== undefined))
    ) {
      rememberVariantGroupRelation(context, relatedProductId, entityId);
    }

    if (
      entityId !== undefined &&
      relatedGroupId !== undefined &&
      (variantOptionResource || (variantPath && explicitEntityGroupId !== undefined))
    ) {
      rememberVariantOptionRelation(context, relatedGroupId, entityId);
    }

    for (const [key, value] of Object.entries(entity)) {
      if (isScalarValue(value)) {
        context.values[key] = value;
      }

      if (typeof value === 'number' && key.toLowerCase().endsWith('id')) {
        if (
          key.toLowerCase() !== 'id' &&
          typeof entity.id === 'number' &&
          Number.isFinite(entity.id)
        ) {
          rememberChildId(context, value, entity.id);
        }

        const resource = resourceCandidatesFromName(key)[0];
        rememberResourceId(context, resource, value);
      }

      if (typeof value === 'string' && key.toLowerCase().includes('slug')) {
        const resource =
          resourceCandidatesFromName(key.replace(/slug/gi, 'Id'))[0] ||
          resourceHint ||
          rootResource;
        rememberResourceSlug(context, resource, value);
      }
    }

    if (typeof entity.id === 'number') {
      rememberResourceId(context, resourceHint || rootResource, entity.id);
    }

    if (typeof entity.slug === 'string') {
      rememberResourceSlug(context, resourceHint || rootResource, entity.slug);
    }
  }
}

function extractEntities(
  value: unknown,
  initialHint?: string,
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const queue: Array<{ value: unknown; hint?: string }> = [
    { value, hint: initialHint },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const { value: node, hint } = current;

    if (Array.isArray(node)) {
      for (const item of node) {
        queue.push({ value: item, hint });
      }
      continue;
    }

    if (!node || typeof node !== 'object') {
      continue;
    }

    const record = node as Record<string, unknown>;
    entities.push({ entity: record, resourceHint: hint });

    for (const [key, nested] of Object.entries(record)) {
      const childHint = normalizeResourceKey(toKebabCase(key)) || hint;
      if (Array.isArray(nested)) {
        for (const item of nested) {
          queue.push({ value: item, hint: childHint });
        }
        continue;
      }

      if (nested && typeof nested === 'object') {
        queue.push({ value: nested, hint: childHint });
      }
    }
  }

  return entities;
}

function statusLabel(status: OperationStatus): string {
  if (status === 'pending') return 'PEND ';
  if (status === 'running') return 'RUN  ';
  if (status === 'passed') return 'PASS ';
  if (status === 'failed') return 'FAIL ';
  return 'SKIP ';
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function renderStates(
  options: CliOptions,
  states: OperationRunState[],
  startedAt: number,
  forceNonTtyLine = false,
): void {
  const totals = {
    total: states.length,
    pending: states.filter((item) => item.status === 'pending').length,
    running: states.filter((item) => item.status === 'running').length,
    passed: states.filter((item) => item.status === 'passed').length,
    failed: states.filter((item) => item.status === 'failed').length,
    skipped: states.filter((item) => item.status === 'skipped').length,
  };

  const done = totals.passed + totals.failed + totals.skipped;
  const elapsed = formatDuration(Date.now() - startedAt);

  const headerLine =
    `OpenAPI HTTP Runner | base: ${options.baseUrl} | token: ${options.token ? 'provided' : 'not provided'}\n` +
    `Progress: ${done}/${totals.total} | PASS: ${totals.passed} | FAIL: ${totals.failed} | SKIP: ${totals.skipped} | RUN: ${totals.running} | PEND: ${totals.pending} | elapsed: ${elapsed}`;

  const lines: string[] = [headerLine, ''];
  for (const state of states) {
    const requestMeta = state.httpStatus ? ` -> ${state.httpStatus}` : '';
    const durationMeta =
      state.durationMs !== undefined ? ` (${state.durationMs}ms)` : '';
    lines.push(
      `${String(state.operation.index).padStart(2, '0')} ${statusLabel(state.status)} ${state.operation.method.toUpperCase().padEnd(6)} ${state.operation.path}${requestMeta}${durationMeta}`,
    );

    if (state.status === 'failed' && state.error) {
      lines.push(`   error: ${truncate(state.error, 220)}`);
    }
  }

  if (process.stdout.isTTY && !forceNonTtyLine) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    process.stdout.write(lines.join('\n'));
    return;
  }

  const latest = [...states]
    .reverse()
    .find((item) => item.status !== 'pending');

  if (!latest) {
    // eslint-disable-next-line no-console
    console.log(
      `Progress: 0/${totals.total} | PASS ${totals.passed} | FAIL ${totals.failed} | SKIP ${totals.skipped}`,
    );
    return;
  }

  const code = latest.httpStatus ? ` -> ${latest.httpStatus}` : '';
  const duration =
    latest.durationMs !== undefined ? ` (${latest.durationMs}ms)` : '';
  const suffix = latest.error ? ` | ${truncate(latest.error, 160)}` : '';

  // eslint-disable-next-line no-console
  console.log(
    `${statusLabel(latest.status).trim()} ${latest.operation.method.toUpperCase()} ${latest.operation.path}${code}${duration}${suffix}`,
  );
}

function buildAuthHeaderValue(token: string, authScheme: string): string {
  if (!authScheme) {
    return token;
  }

  if (token.startsWith(`${authScheme} `)) {
    return token;
  }

  if (token.startsWith('Bearer ') || token.startsWith('Basic ')) {
    return token;
  }

  return `${authScheme} ${token}`;
}

function prepareHeaders(
  options: CliOptions,
  operation: ExtractedOperation,
  contentType?: string,
): Headers {
  const headers = new Headers();
  headers.set('accept', 'application/json, text/plain;q=0.9, */*;q=0.8');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (options.token && operation.requiresAuth) {
    headers.set(
      options.authHeader,
      buildAuthHeaderValue(options.token, options.authScheme),
    );
  }

  return headers;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') {
      out[key] = value ? `${value.split(' ')[0]} ***` : '';
      return;
    }
    out[key] = value;
  });
  return out;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeJson(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderHtmlReport(report: {
  startedAt: string;
  finishedAt: string;
  summary: { total: number; passed: number; failed: number; skipped: number };
  options: {
    baseUrl: string;
    timeoutMs: number;
    tokenProvided: boolean;
    reportPath: string;
    htmlReportPath: string;
  };
  results: Array<{
    index: number;
    method: string;
    path: string;
    status: OperationStatus;
    durationMs?: number;
    httpStatus?: number;
    expectedStatuses?: number[];
    request?: {
      method: string;
      url?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };
    responseBody?: unknown;
    error?: string;
  }>;
}): string {
  const rows = report.results
    .map((result) => {
      const statusClass = `status-${result.status}`;
      const expected = (result.expectedStatuses || []).join(', ');
      const requestMethod = result.request?.method || result.method;
      const requestUrl = result.request?.url || '';
      const requestHeaders = safeJson(result.request?.headers || {});
      const requestBody = safeJson(result.request?.body);
      const responseBody = safeJson(result.responseBody);
      const error = result.error || '';
      const duration =
        result.durationMs !== undefined ? `${result.durationMs} ms` : '-';

      return `
        <tr class="${statusClass}">
          <td>${result.index}</td>
          <td><code>${escapeHtml(requestMethod)}</code></td>
          <td><code>${escapeHtml(result.path)}</code></td>
          <td><span class="badge ${statusClass}">${result.status.toUpperCase()}</span></td>
          <td>${result.httpStatus ?? '-'}</td>
          <td>${escapeHtml(expected || '-')}</td>
          <td>${escapeHtml(duration)}</td>
        </tr>
        <tr class="details ${statusClass}">
          <td colspan="7">
            <div class="panel-grid">
              <div class="panel">
                <div class="panel-title">Request</div>
                <div><strong>URL:</strong> <code>${escapeHtml(requestUrl)}</code></div>
                <div><strong>Headers:</strong></div>
                <pre>${escapeHtml(requestHeaders)}</pre>
                <div><strong>Body:</strong></div>
                <pre>${escapeHtml(requestBody)}</pre>
              </div>
              <div class="panel">
                <div class="panel-title">Response</div>
                <div><strong>Error:</strong> ${escapeHtml(error || '-')}</div>
                <div><strong>Body:</strong></div>
                <pre>${escapeHtml(responseBody)}</pre>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HTTP Smoke Report</title>
  <style>
    :root {
      --ok: #1d8348;
      --fail: #c0392b;
      --skip: #7f8c8d;
      --run: #2e86c1;
      --bg: #f7f7f8;
      --text: #1f2937;
      --border: #d1d5db;
      --card: #ffffff;
      --code: #111827;
    }
    body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin-bottom: 18px; font-size: 14px; }
    .summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .chip { background: var(--card); border: 1px solid var(--border); padding: 8px 10px; border-radius: 8px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); }
    th, td { border-bottom: 1px solid var(--border); padding: 10px; vertical-align: top; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; position: sticky; top: 0; z-index: 2; }
    .badge { font-weight: 700; padding: 2px 8px; border-radius: 999px; color: #fff; display: inline-block; }
    .status-passed .badge, .badge.status-passed { background: var(--ok); }
    .status-failed .badge, .badge.status-failed { background: var(--fail); }
    .status-skipped .badge, .badge.status-skipped { background: var(--skip); }
    tr.status-passed { background: #edf9f1; }
    tr.status-failed, tr.details.status-failed { background: #fff1ef; }
    tr.status-skipped { background: #f4f5f6; }
    tr.details td { padding: 0; }
    .panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .panel { padding: 12px; border-top: 1px dashed var(--border); }
    .panel + .panel { border-left: 1px solid var(--border); }
    .panel-title { font-weight: 700; margin-bottom: 8px; }
    pre { margin: 6px 0 0; background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 8px; overflow: auto; font-size: 12px; }
    code { color: var(--code); }
    @media (max-width: 1000px) {
      .panel-grid { grid-template-columns: 1fr; }
      .panel + .panel { border-left: none; border-top: 1px solid var(--border); }
    }
  </style>
</head>
<body>
  <h1>HTTP Smoke Report</h1>
  <div class="meta">
    Started: <strong>${escapeHtml(report.startedAt)}</strong> |
    Finished: <strong>${escapeHtml(report.finishedAt)}</strong> |
    Base URL: <strong>${escapeHtml(report.options.baseUrl)}</strong>
  </div>

  <div class="summary">
    <div class="chip">Total: <strong>${report.summary.total}</strong></div>
    <div class="chip">PASS: <strong style="color: var(--ok)">${report.summary.passed}</strong></div>
    <div class="chip">FAIL: <strong style="color: var(--fail)">${report.summary.failed}</strong></div>
    <div class="chip">SKIP: <strong style="color: var(--skip)">${report.summary.skipped}</strong></div>
    <div class="chip">Timeout: <strong>${report.options.timeoutMs}ms</strong></div>
    <div class="chip">Token: <strong>${report.options.tokenProvided ? 'provided' : 'not provided'}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Method</th>
        <th>Path</th>
        <th>Status</th>
        <th>HTTP</th>
        <th>Expected</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

async function run(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const doc = readSpec(options.specPath);
  const operations = extractOperations(doc);
  const context: RunContext = {
    runTag: createRunTag(),
    values: {},
    idsByResource: {},
    slugsByResource: {},
    childIdsByParentId: {},
    groupIdsByProductId: {},
    optionIdsByGroupId: {},
  };
  const states: OperationRunState[] = operations.map((operation) => ({
    operation,
    status: 'pending',
  }));

  const startedAt = Date.now();
  renderStates(options, states, startedAt);

  for (const state of states) {
    const { operation } = state;

    if (operation.requiresAuth && !options.token) {
      state.status = 'skipped';
      state.error = 'Skipped: operation requires auth token (--token)';
      renderStates(options, states, startedAt);
      continue;
    }

    state.status = 'running';
    state.startedAt = Date.now();
    renderStates(options, states, startedAt);

    try {
      const builtRequest = buildRequest(
        operation,
        doc,
        options.baseUrl,
        context,
      );
      if (builtRequest.unresolvedPathParams.length > 0) {
        state.status = 'skipped';
        state.durationMs = Date.now() - (state.startedAt || Date.now());
        state.error = `Skipped: unresolved path parameters (${builtRequest.unresolvedPathParams.join(', ')})`;
        renderStates(options, states, startedAt);
        continue;
      }
      const request = normalizeRequestForOperation(
        operation,
        builtRequest,
        context,
      );
      const headers = prepareHeaders(options, operation, request.contentType);
      const expectedStatuses = expectedSuccessStatuses(operation.responses);
      const method = operation.method.toUpperCase();
      state.requestMethod = method;
      state.requestUrl = request.url;
      state.requestHeaders = headersToObject(headers);
      state.requestBody = request.body;

      const init: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(options.timeoutMs),
      };

      if (
        request.body !== undefined &&
        method !== 'GET' &&
        method !== 'DELETE'
      ) {
        if (request.contentType === 'application/json') {
          init.body = JSON.stringify(request.body);
        } else if (typeof request.body === 'string') {
          init.body = request.body;
        } else {
          init.body = JSON.stringify(request.body);
        }
      }

      const response = await fetch(request.url, init);
      const responseText = await response.text();
      const parsedBody = parseResponseBody(responseText);
      const isSuccess =
        expectedStatuses.length > 0
          ? expectedStatuses.includes(response.status)
          : response.ok;

      state.httpStatus = response.status;
      state.expectedStatuses = expectedStatuses;
      state.responseBody = parsedBody;
      state.durationMs = Date.now() - (state.startedAt || Date.now());

      if (isSuccess) {
        state.status = 'passed';
        updateContext(context, operation, parsedBody, builtRequest.selectedParams);
      } else {
        state.status = 'failed';
        const expected =
          expectedStatuses.length > 0 ? expectedStatuses.join(', ') : '2xx';
        const details =
          typeof parsedBody === 'string'
            ? parsedBody
            : JSON.stringify(parsedBody);
        state.error = `Expected [${expected}], got ${response.status}. Response: ${truncate(details || 'empty', 400)}`;
      }
    } catch (error) {
      state.status = 'failed';
      state.durationMs = Date.now() - (state.startedAt || Date.now());
      state.error = error instanceof Error ? error.message : String(error);
    }

    renderStates(options, states, startedAt);

    if (options.failFast && state.status === 'failed') {
      break;
    }
  }

  const finishedAt = Date.now();
  if (process.stdout.isTTY) {
    process.stdout.write('\n');
  }

  const summary = {
    total: states.length,
    passed: states.filter((item) => item.status === 'passed').length,
    failed: states.filter((item) => item.status === 'failed').length,
    skipped: states.filter((item) => item.status === 'skipped').length,
    durationMs: finishedAt - startedAt,
  };

  const report = {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    options: {
      baseUrl: options.baseUrl,
      specPath: options.specPath,
      authHeader: options.authHeader,
      authScheme: options.authScheme,
      timeoutMs: options.timeoutMs,
      failFast: options.failFast,
      tokenProvided: Boolean(options.token),
      reportPath: options.reportPath,
      htmlReportPath: options.htmlReportPath,
    },
    context,
    summary,
    results: states.map((item) => ({
      index: item.operation.index,
      method: item.operation.method.toUpperCase(),
      path: item.operation.path,
      status: item.status,
      durationMs: item.durationMs,
      httpStatus: item.httpStatus,
      expectedStatuses: item.expectedStatuses,
      request: {
        method: item.requestMethod || item.operation.method.toUpperCase(),
        url: item.requestUrl,
        headers: item.requestHeaders,
        body: item.requestBody,
      },
      requestUrl: item.requestUrl,
      requestHeaders: item.requestHeaders,
      requestBody: item.requestBody,
      responseBody: item.responseBody,
      error: item.error,
    })),
  };

  const absoluteReportPath = resolve(process.cwd(), options.reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(
    absoluteReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  const absoluteHtmlReportPath = resolve(process.cwd(), options.htmlReportPath);
  mkdirSync(dirname(absoluteHtmlReportPath), { recursive: true });
  writeFileSync(absoluteHtmlReportPath, renderHtmlReport(report), 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `\nRun completed: PASS ${summary.passed} | FAIL ${summary.failed} | SKIP ${summary.skipped} | TOTAL ${summary.total} | ${formatDuration(summary.durationMs)}`,
  );
  // eslint-disable-next-line no-console
  console.log(`Report saved: ${absoluteReportPath}`);
  // eslint-disable-next-line no-console
  console.log(`HTML report: ${absoluteHtmlReportPath}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(
    `Runner crashed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
