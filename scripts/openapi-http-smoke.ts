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

type OpenApiOperation = {
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
};

type OpenApiPathItem = {
  parameters?: OpenApiParameter[];
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
};

type OpenApiDoc = {
  paths: Record<string, OpenApiPathItem>;
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
  categoryId?: number;
  productId?: number;
  branchId?: number;
  branchProductId?: number;
  variantGroupId?: number;
  variantOptionId?: number;
  priceOptionIds?: number[];
  productSlug?: string;
  childIdsByParentId?: Record<string, number[]>;
  runTag: string;
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
  const defaultReportPath = 'reports/http-smoke-latest.json';
  const defaultHtmlReportPath = 'reports/http-smoke-latest.html';

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
OpenAPI HTTP smoke runner

Usage:
  npm run http:smoke -- --base-url http://localhost:3002 --token <JWT>

Options:
  --base-url <url>        Base URL for API requests (default from .env SERVICE_PORT)
  --spec <path>           Path to OpenAPI file (default: openapi.json)
  --token, -t <token>     Auth token value
  --auth-header <name>    Header name for token (default: Authorization)
  --auth-scheme <scheme>  Prefix for token value (default: Bearer)
  --timeout-ms <number>   Request timeout in milliseconds (default: 15000)
  --report <path>         JSON report path (default: reports/http-smoke-latest.json)
  --html-report <path>    HTML report path (default: reports/http-smoke-latest.html)
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
    return value.map((item) => applyContextToPayload(item, context));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (key === 'categoryId' && context.categoryId !== undefined) {
        out[key] = context.categoryId;
        continue;
      }
      if (key === 'productId' && context.productId !== undefined) {
        out[key] = context.productId;
        continue;
      }
      if (key === 'branchId' && context.branchId !== undefined) {
        out[key] = context.branchId;
        continue;
      }
      if (key === 'groupId' && context.variantGroupId !== undefined) {
        out[key] = context.variantGroupId;
        continue;
      }
      if (key === 'optionId' && context.variantOptionId !== undefined) {
        out[key] = context.variantOptionId;
        continue;
      }
      if (key === 'optionIds') {
        if (
          Array.isArray(context.priceOptionIds) &&
          context.priceOptionIds.length > 0
        ) {
          out[key] = [...context.priceOptionIds];
          continue;
        }
        if (context.variantOptionId !== undefined) {
          out[key] = [context.variantOptionId];
          continue;
        }
        out[key] = [];
        continue;
      }

      out[key] = applyContextToPayload(item, context);
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
      const requiresAuth = path.startsWith('/api/admin/');

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
  if (operation.path.startsWith('/health/')) return 0;
  if (operation.path === '/health' && operation.method === 'post') return 1;

  if (operation.method === 'post' && operation.path === '/api/admin/categories')
    return 10;
  if (operation.method === 'post' && operation.path === '/api/admin/branches')
    return 11;
  if (operation.method === 'post' && operation.path === '/api/admin/products')
    return 12;
  if (
    operation.method === 'post' &&
    operation.path.includes('/variant-groups') &&
    !operation.path.includes('/options')
  )
    return 13;
  if (
    operation.method === 'post' &&
    operation.path.includes('/variant-groups') &&
    operation.path.includes('/options')
  )
    return 14;
  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/branch-products'
  )
    return 15;

  if (operation.method === 'post') return 20;
  if (operation.method === 'get' && !operation.path.includes('{')) return 30;
  if (operation.method === 'get') return 40;
  if (operation.method === 'patch' && !operation.path.endsWith('/restore'))
    return 50;
  if (operation.method === 'delete') {
    const pathParams = (operation.path.match(/\{[^}]+\}/g) || []).length;
    return 60 - pathParams * 2;
  }
  if (operation.method === 'patch' && operation.path.endsWith('/restore'))
    return 70;
  if (operation.method === 'put') return 80;

  return 100;
}

function contextValueForParam(
  name: string,
  path: string,
  context: RunContext,
): unknown {
  if (name === 'id') {
    if (path.includes('/branch-products')) return context.branchProductId;
    if (path.includes('/branches')) return context.branchId;
    if (path.includes('/categories')) return context.categoryId;
    if (path.includes('/products')) return context.productId;
  }

  if (name === 'categoryId') return context.categoryId;
  if (name === 'productId') return context.productId;
  if (name === 'branchId') return context.branchId;
  if (name === 'parentId') return 0;
  if (name === 'groupId') return context.variantGroupId;
  if (name === 'optionId') return context.variantOptionId;
  if (name === 'slug') return context.productSlug;
  if (name === 'optionIds') {
    if (
      Array.isArray(context.priceOptionIds) &&
      context.priceOptionIds.length > 0
    ) {
      return [...context.priceOptionIds];
    }
    if (context.variantOptionId !== undefined) {
      return [context.variantOptionId];
    }
    return [];
  }

  return undefined;
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

  for (const raw of operation.parameters) {
    const parameter = resolveParameter(raw, doc);
    let value = contextValueForParam(parameter.name, operation.path, context);

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

    if (value === undefined) {
      value = fallbackByType(parameter.schema, parameter.name);
    }

    if (value === undefined) {
      continue;
    }

    if (parameter.in === 'path') {
      pathValues[parameter.name] = value;
    } else if (parameter.in === 'query') {
      queryValues[parameter.name] = value;
    }
  }

  const resolvedPath = operation.path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathValues[key];
    if (value === undefined || value === null) {
      return encodeURIComponent('1');
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

  const requestBody = resolveRequestBody(operation.requestBody, doc);
  if (!requestBody?.content) {
    return { url: url.toString() };
  }

  const contentType = requestBody.content['application/json']
    ? 'application/json'
    : Object.keys(requestBody.content)[0];

  if (!contentType) {
    return { url: url.toString() };
  }

  const media = requestBody.content[contentType];
  let body = buildExampleFromMedia(media, doc);
  body = applyContextToPayload(body, context);

  return {
    url: url.toString(),
    contentType,
    body,
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

function shouldSkipStringSuffix(key: string | undefined, value: string): boolean {
  if (!value.trim()) {
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
    return value.map((item) => appendRunSuffixToPayload(item, runTag, keyHint));
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

function rememberChildId(
  context: RunContext,
  parentId: number,
  childId: number,
): void {
  if (!Number.isFinite(parentId) || !Number.isFinite(childId)) {
    return;
  }

  if (!context.childIdsByParentId) {
    context.childIdsByParentId = {};
  }

  const key = String(parentId);
  const ids = context.childIdsByParentId[key] || [];
  if (!ids.includes(childId)) {
    ids.push(childId);
  }
  context.childIdsByParentId[key] = ids;
}

function latestChildIdForParent(
  context: RunContext,
  parentId: number | undefined,
): number | undefined {
  if (parentId === undefined || !context.childIdsByParentId) {
    return undefined;
  }

  const ids = context.childIdsByParentId[String(parentId)];
  if (!Array.isArray(ids) || ids.length === 0) {
    return undefined;
  }

  return ids[ids.length - 1];
}

function collectPriceOptionIds(body: unknown): number[] {
  const entities = extractEntities(body);
  const required: number[] = [];
  const fallback: number[] = [];

  for (const item of entities) {
    if (!Array.isArray(item.options)) {
      continue;
    }

    const firstOption = item.options.find(
      (option) =>
        option &&
        typeof option === 'object' &&
        typeof (option as Record<string, unknown>).id === 'number' &&
        (option as Record<string, unknown>).isActive !== false,
    ) as Record<string, unknown> | undefined;

    if (!firstOption) {
      continue;
    }

    const optionId = firstOption.id as number;
    fallback.push(optionId);

    if (item.isRequired === true) {
      required.push(optionId);
    }
  }

  const selected = required.length > 0 ? required : fallback;
  return [...new Set(selected)];
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
  const mutationTag = createOperationTag(context.runTag, operation.index);

  if (isMutationMethod && operation.path.startsWith('/api/admin/')) {
    normalized.body = appendRunSuffixToPayload(normalized.body, mutationTag);
  }

  const body =
    normalized.body &&
    typeof normalized.body === 'object' &&
    !Array.isArray(normalized.body)
      ? (normalized.body as Record<string, unknown>)
      : undefined;

  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/categories' &&
    body
  ) {
    if (typeof body.slug === 'string') {
      body.slug = appendRunTagToSlug(body.slug, mutationTag);
    }
    if (context.categoryId === undefined) {
      delete body.parentId;
    }
  }

  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/products' &&
    body
  ) {
    if (context.categoryId !== undefined) {
      body.categoryId = context.categoryId;
    }
    if (typeof body.slug === 'string') {
      body.slug = appendRunTagToSlug(body.slug, mutationTag);
    }
  }

  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/branch-products' &&
    body
  ) {
    if (context.productId !== undefined) {
      body.productId = context.productId;
    }
    if (context.branchId !== undefined) {
      body.branchId = context.branchId;
    }
  }

  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/products/{productId}/variant-groups' &&
    body
  ) {
    body.isRequired = false;
  }

  if (
    operation.method === 'patch' &&
    operation.path === '/api/admin/categories/{id}' &&
    body
  ) {
    if (typeof body.slug === 'string') {
      body.slug = appendRunTagToSlug(body.slug, mutationTag);
    }
    body.parentId = 0;
  }

  if (
    operation.method === 'patch' &&
    operation.path === '/api/admin/products/{id}' &&
    body
  ) {
    if (typeof body.slug === 'string') {
      body.slug = appendRunTagToSlug(body.slug, mutationTag);
    }
    if (context.categoryId !== undefined) {
      body.categoryId = context.categoryId;
    }

    if (Array.isArray(body.variantGroups)) {
      let optionIdUsed = false;
      body.variantGroups = body.variantGroups
        .filter((group) => group && typeof group === 'object')
        .map((group, groupIndex) => {
          const normalizedGroup = group as Record<string, unknown>;

          if (context.variantGroupId !== undefined && groupIndex === 0) {
            normalizedGroup.id = context.variantGroupId;
          } else {
            delete normalizedGroup.id;
          }

          const updatesExistingGroup = typeof normalizedGroup.id === 'number';
          if (updatesExistingGroup) {
            // Avoid accidental rename collisions on unique(productId, name).
            delete normalizedGroup.name;
          } else if (typeof normalizedGroup.name === 'string') {
            normalizedGroup.name = appendRunTagToName(
              normalizedGroup.name,
              mutationTag,
            );
          }

          if (Array.isArray(normalizedGroup.options)) {
            const optionIdForGroup = latestChildIdForParent(
              context,
              typeof normalizedGroup.id === 'number'
                ? (normalizedGroup.id as number)
                : undefined,
            );
            normalizedGroup.options = normalizedGroup.options
              .filter((option) => option && typeof option === 'object')
              .map((option) => {
                const normalizedOption = option as Record<string, unknown>;

                if (
                  optionIdForGroup !== undefined &&
                  !optionIdUsed &&
                  groupIndex === 0
                ) {
                  normalizedOption.id = optionIdForGroup;
                  optionIdUsed = true;
                } else {
                  delete normalizedOption.id;
                }

                const updatesExistingOption =
                  typeof normalizedOption.id === 'number';
                if (updatesExistingOption) {
                  // Keep id-based option updates minimal and safe.
                  delete normalizedOption.name;
                } else if (typeof normalizedOption.name === 'string') {
                  normalizedOption.name = appendRunTagToName(
                    normalizedOption.name,
                    mutationTag,
                  );
                }

                return normalizedOption;
              })
              .filter(
                (option) =>
                  typeof (option as Record<string, unknown>).id === 'number' ||
                  typeof (option as Record<string, unknown>).name === 'string',
              );
          }

          return normalizedGroup;
        })
        .filter(
          (group) =>
            typeof (group as Record<string, unknown>).id === 'number' ||
            typeof (group as Record<string, unknown>).name === 'string',
        );
    }
  }

  if (operation.path === '/api/branch-products/by-slug') {
    const url = new URL(normalized.url);
    if (context.productSlug) {
      url.searchParams.set('slug', context.productSlug);
    }
    if (context.branchId !== undefined) {
      url.searchParams.set('branchId', String(context.branchId));
    }
    normalized.url = url.toString();
  }

  return normalized;
}

function getMissingDependencies(
  operation: ExtractedOperation,
  context: RunContext,
): string[] {
  const missing: string[] = [];

  const requireDep = (name: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      missing.push(name);
    }
  };

  if (operation.method === 'post' && operation.path === '/api/admin/products') {
    requireDep('categoryId', context.categoryId);
  }

  if (
    operation.method === 'post' &&
    operation.path === '/api/admin/branch-products'
  ) {
    requireDep('productId', context.productId);
    requireDep('branchId', context.branchId);
  }

  if (operation.path.includes('{productId}')) {
    requireDep('productId', context.productId);
  }

  if (operation.path.includes('{groupId}')) {
    requireDep('variantGroupId', context.variantGroupId);
  }

  if (operation.path.includes('{optionId}')) {
    requireDep('variantOptionId', context.variantOptionId);
  }

  if (operation.path.includes('/branch-products/{id}')) {
    requireDep('branchProductId', context.branchProductId);
  }

  if (operation.path.includes('/branches/{id}')) {
    requireDep('branchId', context.branchId);
  }

  if (operation.path.includes('/categories/{id}')) {
    requireDep('categoryId', context.categoryId);
  }

  if (operation.path.includes('/products/{id}')) {
    requireDep('productId', context.productId);
  }

  if (operation.path === '/api/branch-products/by-slug') {
    requireDep('productSlug', context.productSlug);
    requireDep('branchId', context.branchId);
  }

  return [...new Set(missing)];
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

function updateContext(
  context: RunContext,
  operation: ExtractedOperation,
  body: unknown,
): void {
  if (body === undefined || body === null) {
    return;
  }

  const items = extractEntities(body);
  if (items.length === 0) {
    return;
  }

  const priceOptionIds = collectPriceOptionIds(body);
  if (priceOptionIds.length > 0) {
    context.priceOptionIds = priceOptionIds;
    context.variantOptionId = priceOptionIds[0];
  }

  for (const item of items) {
    if (typeof item.id === 'number') {
      for (const [key, value] of Object.entries(item)) {
        if (
          key.toLowerCase().endsWith('id') &&
          key.toLowerCase() !== 'id' &&
          typeof value === 'number'
        ) {
          rememberChildId(context, value, item.id);
        }
      }
    }

    if (
      (operation.path.includes('/products') ||
        operation.path.includes('/branch-products')) &&
      typeof item.slug === 'string'
    ) {
      context.productSlug = item.slug;
    }

    if (typeof item.id !== 'number') {
      continue;
    }

    if (
      operation.path.includes('/variant-groups') &&
      operation.path.includes('/options')
    ) {
      const looksLikeOption =
        typeof item.groupId === 'number' || typeof item.priceDelta === 'number';
      if (!looksLikeOption) {
        continue;
      }
      context.variantOptionId = item.id;
      continue;
    }

    if (operation.path.includes('/variant-groups')) {
      const looksLikeGroup =
        Array.isArray(item.options) ||
        typeof item.isRequired === 'boolean' ||
        typeof item.productId === 'number';
      if (!looksLikeGroup) {
        continue;
      }
      context.variantGroupId = item.id;
      continue;
    }

    if (operation.path.includes('/branch-products')) {
      context.branchProductId = item.id;
      continue;
    }

    if (operation.path.includes('/branches')) {
      context.branchId = item.id;
      continue;
    }

    if (operation.path.includes('/products')) {
      const looksLikeProduct =
        typeof item.categoryId === 'number' ||
        typeof item.price === 'number' ||
        Array.isArray(item.variantGroups) ||
        ('fullName' in item && 'slug' in item);
      if (!looksLikeProduct) {
        continue;
      }
      context.productId = item.id;
      continue;
    }

    if (operation.path.includes('/categories')) {
      context.categoryId = item.id;
    }
  }
}

function extractEntities(value: unknown): Array<Record<string, unknown>> {
  const entities: Array<Record<string, unknown>> = [];
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    const record = current as Record<string, unknown>;
    entities.push(record);

    for (const key of ['items', 'options', 'variantGroups', 'data']) {
      const nested = record[key];
      if (Array.isArray(nested)) {
        for (const item of nested) {
          queue.push(item);
        }
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

    const missingDependencies = getMissingDependencies(operation, context);
    if (missingDependencies.length > 0) {
      state.status = 'skipped';
      state.error = `Skipped: missing dependencies (${missingDependencies.join(', ')})`;
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
        updateContext(context, operation, parsedBody);
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
