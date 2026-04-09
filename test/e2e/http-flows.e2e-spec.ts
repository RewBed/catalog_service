import { INestApplication } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import type { Response, Test as SupertestRequest } from 'supertest';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { AUTH_SERVICE_GRPC } from 'src/common/auth';
import { AppExceptionLoggingFilter } from 'src/common/filters/app-exception-logging.filter';
import { HttpLoggerErrorInterceptor } from 'src/common/interceptors/http-logger-error.interceptor';
import { createGlobalValidationPipe } from 'src/common/pipes/global-validation.pipe';
import { PrismaService } from 'src/core/database/prisma.service';
import { truncateAllPublicTables } from '../integration-db/helpers/prisma-integration';
import { HttpMethodTracker } from './helpers/http-method-tracker';

function resolveE2eAuthToken(): string {
  const token = process.env.E2E_AUTH_TOKEN?.trim();
  return token && token.length > 0 ? token : 'e2e-token';
}

const e2eAuthToken = resolveE2eAuthToken();

const fakeAuthClient: Pick<ClientGrpc, 'getService'> = {
  getService() {
    return {
      verifyAccessToken: ({ accessToken }: { accessToken: string }) => {
        if (accessToken === e2eAuthToken) {
          return of({
            valid: true,
            userId: 'e2e-user-id',
            username: 'e2e-user',
            role: 'admin',
            message: 'ok',
          });
        }

        return of({
          valid: false,
          userId: '',
          username: '',
          role: '',
          message: 'Invalid access token',
        });
      },
    };
  },
};

describe('E2E HTTP flows', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tracker = new HttpMethodTracker();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_SERVICE_GRPC)
      .useValue(fakeAuthClient)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(app.get(AppExceptionLoggingFilter));
    app.useGlobalInterceptors(app.get(HttpLoggerErrorInterceptor));
    app.useGlobalPipes(createGlobalValidationPipe());

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAllPublicTables(prisma as any);
  });

  afterAll(async () => {
    tracker.writeJsonReport('reports/e2e-http-latest.json');
    tracker.printConsoleSummary();

    await app.close();
  });

  const adminAuth = { Authorization: `Bearer ${e2eAuthToken}` };

  async function runHttp(
    method: string,
    path: string,
    expectedStatus: number | number[],
    makeRequest: () => Promise<Response>,
  ): Promise<Response> {
    const startedAt = Date.now();
    let response: Response | null = null;

    try {
      response = await makeRequest();
      const expectedStatuses = Array.isArray(expectedStatus)
        ? expectedStatus
        : [expectedStatus];
      const ok = expectedStatuses.includes(response.status);

      tracker.add({
        method,
        path,
        expectedStatus,
        actualStatus: response.status,
        ok,
        durationMs: Date.now() - startedAt,
        ...(ok
          ? {}
          : {
              error: `Expected status ${expectedStatuses.join('|')}, got ${response.status}. Body: ${JSON.stringify(response.body)}`,
            }),
      });

      if (!ok) {
        throw new Error(
          `HTTP ${method} ${path} expected ${expectedStatuses.join('|')} but got ${response.status}`,
        );
      }

      return response;
    } catch (error) {
      if (!response) {
        tracker.add({
          method,
          path,
          expectedStatus,
          actualStatus: 0,
          ok: false,
          durationMs: Date.now() - startedAt,
          error:
            error instanceof Error
              ? error.message
              : `Unknown error: ${String(error)}`,
        });
      }

      throw error;
    }
  }

  function withAdmin(req: SupertestRequest): SupertestRequest {
    return req.set(adminAuth);
  }

  it('health endpoints: live/ready/index/create + validation', async () => {
    const http = app.getHttpServer();

    await runHttp('GET', '/health/live', 200, () =>
      request(http).get('/health/live'),
    );
    await runHttp('GET', '/health/ready', 200, () =>
      request(http).get('/health/ready'),
    );
    await runHttp('GET', '/health', 200, () => request(http).get('/health'));
    await runHttp('POST', '/health', 201, () =>
      request(http).post('/health').send({ test: 'ok' }),
    );
    await runHttp('POST', '/health (invalid)', 400, () =>
      request(http).post('/health').send({}),
    );
  });

  it('category and branch admin/public flow + validation errors', async () => {
    const http = app.getHttpServer();

    await runHttp('POST', '/api/admin/categories (authorized)', 201, () =>
      withAdmin(request(http).post('/api/admin/categories')).send({
        name: 'Authorized category',
        slug: 'authorized-category',
      }),
    );
    await runHttp('POST', '/api/admin/categories (invalid body)', 400, () =>
      withAdmin(request(http).post('/api/admin/categories')).send({ slug: 'missing-name' }),
    );
    await runHttp('GET', '/api/categories/not-int', 400, () =>
      request(http).get('/api/categories/not-int'),
    );

    const createdCategory = await runHttp('POST', '/api/admin/categories', 201, () =>
      withAdmin(request(http).post('/api/admin/categories')).send({
        name: 'Tables',
        slug: 'tables',
        description: 'Tables category',
      }),
    );
    const categoryId = createdCategory.body.id as number;

    await runHttp('GET', `/api/admin/categories/${categoryId}`, 200, () =>
      withAdmin(request(http).get(`/api/admin/categories/${categoryId}`)),
    );
    await runHttp('GET', `/api/categories/${categoryId}`, 200, () =>
      request(http).get(`/api/categories/${categoryId}`),
    );
    await runHttp('PATCH', `/api/admin/categories/${categoryId}`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/categories/${categoryId}`)).send({
        name: 'Tables updated',
      }),
    );
    await runHttp('DELETE', `/api/admin/categories/${categoryId}`, 204, () =>
      withAdmin(request(http).delete(`/api/admin/categories/${categoryId}`)),
    );
    await runHttp('GET', `/api/categories/${categoryId} (deleted)`, 404, () =>
      request(http).get(`/api/categories/${categoryId}`),
    );
    await runHttp('PATCH', `/api/admin/categories/${categoryId}/restore`, 200, () =>
      withAdmin(
        request(http).patch(`/api/admin/categories/${categoryId}/restore`),
      ),
    );
    await runHttp('GET', `/api/categories/${categoryId} (restored)`, 200, () =>
      request(http).get(`/api/categories/${categoryId}`),
    );
    await runHttp('GET', '/api/admin/categories?page=0', 400, () =>
      withAdmin(request(http).get('/api/admin/categories?page=0')),
    );

    const createdBranch = await runHttp('POST', '/api/admin/branches', 201, () =>
      withAdmin(request(http).post('/api/admin/branches')).send({
        name: 'Central',
        address: 'Main st 1',
        city: 'Moscow',
      }),
    );
    const branchId = createdBranch.body.id as number;

    await runHttp('GET', '/api/branches', 200, () => request(http).get('/api/branches'));
    await runHttp('GET', `/api/branches/${branchId}`, 200, () =>
      request(http).get(`/api/branches/${branchId}`),
    );
    await runHttp('PATCH', `/api/admin/branches/${branchId}`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/branches/${branchId}`)).send({
        workingHours: 'Mon-Sun 09:00-22:00',
      }),
    );
    await runHttp('DELETE', `/api/admin/branches/${branchId}`, 204, () =>
      withAdmin(request(http).delete(`/api/admin/branches/${branchId}`)),
    );
    await runHttp('GET', `/api/branches/${branchId} (inactive)`, 404, () =>
      request(http).get(`/api/branches/${branchId}`),
    );
    await runHttp('PATCH', `/api/admin/branches/${branchId}/restore`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/branches/${branchId}/restore`)),
    );
    await runHttp('GET', `/api/branches/${branchId} (restored)`, 200, () =>
      request(http).get(`/api/branches/${branchId}`),
    );
  });

  it('full catalog flow: product, variants, branch-products, collections, delete/restore', async () => {
    const http = app.getHttpServer();

    const createdCategory = await runHttp('POST', '/api/admin/categories', 201, () =>
      withAdmin(request(http).post('/api/admin/categories')).send({
        name: 'Catalog category',
        slug: 'catalog-category',
      }),
    );
    const categoryId = createdCategory.body.id as number;

    const createdProduct = await runHttp('POST', '/api/admin/products', 201, () =>
      withAdmin(request(http).post('/api/admin/products')).send({
        name: 'Oak table',
        slug: 'oak-table',
        sku: 'SKU-OAK',
        price: 1000,
        categoryId,
        variantGroups: [
          {
            name: 'Size',
            isRequired: true,
            sortOrder: 1,
            options: [
              {
                name: '120 cm',
                priceDelta: 0,
                sortOrder: 1,
              },
            ],
          },
        ],
      }),
    );
    const productId = createdProduct.body.id as number;

    await runHttp('GET', `/api/admin/products/${productId}`, 200, () =>
      withAdmin(request(http).get(`/api/admin/products/${productId}`)),
    );
    await runHttp('GET', '/api/admin/products?name=oak', 200, () =>
      withAdmin(request(http).get('/api/admin/products?name=oak')),
    );

    const publicGroups = await runHttp(
      'GET',
      `/api/products/${productId}/variant-groups`,
      200,
      () => request(http).get(`/api/products/${productId}/variant-groups`),
    );
    const requiredOptionId = publicGroups.body[0]?.options?.[0]?.id as number;

    await runHttp(
      'GET',
      `/api/products/${productId}/variant-groups/price`,
      200,
      () =>
        request(http).get(
          `/api/products/${productId}/variant-groups/price?optionIds=${requiredOptionId}`,
        ),
    );

    const createdAddonGroup = await runHttp(
      'POST',
      `/api/admin/products/${productId}/variant-groups`,
      201,
      () =>
        withAdmin(
          request(http).post(`/api/admin/products/${productId}/variant-groups`),
        ).send({
          name: 'Addon',
          isRequired: false,
        }),
    );
    const addonGroupId = createdAddonGroup.body.id as number;

    const createdAddonOption = await runHttp(
      'POST',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options`,
      201,
      () =>
        withAdmin(
          request(http).post(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options`,
          ),
        ).send({
          name: 'Drawer',
          priceDelta: 100,
        }),
    );
    const addonOptionId = createdAddonOption.body.id as number;

    await runHttp(
      'PATCH',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}`,
      200,
      () =>
        withAdmin(
          request(http).patch(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}`,
          ),
        ).send({
          priceDelta: 150,
        }),
    );
    await runHttp(
      'DELETE',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}`,
      204,
      () =>
        withAdmin(
          request(http).delete(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}`,
          ),
        ),
    );
    await runHttp(
      'PATCH',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}/restore`,
      200,
      () =>
        withAdmin(
          request(http).patch(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}/options/${addonOptionId}/restore`,
          ),
        ),
    );
    await runHttp(
      'DELETE',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}`,
      204,
      () =>
        withAdmin(
          request(http).delete(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}`,
          ),
        ),
    );
    await runHttp(
      'PATCH',
      `/api/admin/products/${productId}/variant-groups/${addonGroupId}/restore`,
      200,
      () =>
        withAdmin(
          request(http).patch(
            `/api/admin/products/${productId}/variant-groups/${addonGroupId}/restore`,
          ),
        ),
    );

    const createdBranch = await runHttp('POST', '/api/admin/branches', 201, () =>
      withAdmin(request(http).post('/api/admin/branches')).send({
        name: 'Central branch',
        address: 'Branch st 1',
      }),
    );
    const branchId = createdBranch.body.id as number;

    const createdBranchProduct = await runHttp(
      'POST',
      '/api/admin/branch-products',
      201,
      () =>
        withAdmin(request(http).post('/api/admin/branch-products')).send({
          productId,
          branchId,
          price: 1100,
          stock: 7,
        }),
    );
    const branchProductId = createdBranchProduct.body.id as number;

    await runHttp(
      'GET',
      `/api/branch-products?branchId=${branchId}`,
      200,
      () => request(http).get(`/api/branch-products?branchId=${branchId}`),
    );
    await runHttp('GET', `/api/branch-products/${branchProductId}`, 200, () =>
      request(http).get(`/api/branch-products/${branchProductId}`),
    );
    await runHttp(
      'GET',
      `/api/branch-products/by-slug?slug=oak-table&branchId=${branchId}`,
      200,
      () =>
        request(http).get(
          `/api/branch-products/by-slug?slug=oak-table&branchId=${branchId}`,
        ),
    );
    await runHttp('PATCH', `/api/admin/branch-products/${branchProductId}`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/branch-products/${branchProductId}`)).send(
        {
          price: 1200,
          stock: 9,
        },
      ),
    );

    const createdCollection = await runHttp(
      'POST',
      '/api/admin/collections',
      201,
      () =>
        withAdmin(request(http).post('/api/admin/collections')).send({
          title: 'Featured',
          productIds: [productId],
        }),
    );
    const collectionId = createdCollection.body.id as number;

    await runHttp('GET', `/api/admin/collections/${collectionId}`, 200, () =>
      withAdmin(request(http).get(`/api/admin/collections/${collectionId}`)),
    );
    await runHttp(
      'GET',
      `/api/collections/${collectionId}/branches/${branchId}`,
      200,
      () =>
        request(http).get(`/api/collections/${collectionId}/branches/${branchId}`),
    );
    await runHttp('PATCH', `/api/admin/collections/${collectionId}`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/collections/${collectionId}`)).send({
        description: 'Updated collection',
      }),
    );
    await runHttp('DELETE', `/api/admin/collections/${collectionId}`, 204, () =>
      withAdmin(request(http).delete(`/api/admin/collections/${collectionId}`)),
    );

    await runHttp('DELETE', `/api/admin/branch-products/${branchProductId}`, 204, () =>
      withAdmin(request(http).delete(`/api/admin/branch-products/${branchProductId}`)),
    );
    await runHttp(
      'GET',
      `/api/branch-products/${branchProductId} (inactive)`,
      404,
      () => request(http).get(`/api/branch-products/${branchProductId}`),
    );
    await runHttp(
      'PATCH',
      `/api/admin/branch-products/${branchProductId}/restore`,
      200,
      () =>
        withAdmin(
          request(http).patch(`/api/admin/branch-products/${branchProductId}/restore`),
        ),
    );
    await runHttp(
      'GET',
      `/api/branch-products/${branchProductId} (restored)`,
      200,
      () => request(http).get(`/api/branch-products/${branchProductId}`),
    );

    await runHttp('DELETE', `/api/admin/products/${productId}`, 204, () =>
      withAdmin(request(http).delete(`/api/admin/products/${productId}`)),
    );
    await runHttp(
      'GET',
      `/api/branch-products/${branchProductId} (product deleted)`,
      404,
      () => request(http).get(`/api/branch-products/${branchProductId}`),
    );
    await runHttp('PATCH', `/api/admin/products/${productId}/restore`, 200, () =>
      withAdmin(request(http).patch(`/api/admin/products/${productId}/restore`)),
    );
    await runHttp(
      'PATCH',
      `/api/admin/branch-products/${branchProductId}/restore (after product restore)`,
      200,
      () =>
        withAdmin(
          request(http).patch(`/api/admin/branch-products/${branchProductId}/restore`),
        ),
    );
    await runHttp(
      'GET',
      `/api/branch-products/${branchProductId} (restored after product restore)`,
      200,
      () => request(http).get(`/api/branch-products/${branchProductId}`),
    );
  });
});
