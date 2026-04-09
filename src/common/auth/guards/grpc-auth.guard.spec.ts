import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GrpcAuthGuard } from './grpc-auth.guard';

type RequestLike = {
  headers: {
    authorization?: string;
  };
  user?: {
    userId: string;
    username: string;
    role: string;
  };
};

const createContext = (request: RequestLike) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('GrpcAuthGuard', () => {
  it('authenticates valid bearer token and injects request user', async () => {
    const authService = {
      verifyAccessToken: jest.fn(() =>
        of({
          valid: true,
          userId: 'u-1',
          username: 'john',
          role: 'admin',
          message: '',
        }),
      ),
    };
    const authClient = {
      getService: jest.fn(() => authService),
    };
    const guard = new GrpcAuthGuard(authClient as any);
    guard.onModuleInit();
    const request: RequestLike = {
      headers: { authorization: 'Bearer good-token' },
    };

    const allowed = await guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(authService.verifyAccessToken).toHaveBeenCalledWith({
      accessToken: 'good-token',
    });
    expect(request.user).toEqual({
      userId: 'u-1',
      username: 'john',
      role: 'admin',
    });
  });

  it('throws unauthorized when bearer token is missing or malformed', async () => {
    const authService = {
      verifyAccessToken: jest.fn(),
    };
    const authClient = {
      getService: jest.fn(() => authService),
    };
    const guard = new GrpcAuthGuard(authClient as any);
    guard.onModuleInit();

    await expect(
      guard.canActivate(
        createContext({
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      guard.canActivate(
        createContext({
          headers: { authorization: 'Basic token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws unauthorized when token is invalid according to auth service', async () => {
    const authService = {
      verifyAccessToken: jest.fn(() =>
        of({
          valid: false,
          userId: '',
          username: '',
          role: '',
          message: 'Invalid access token',
        }),
      ),
    };
    const authClient = {
      getService: jest.fn(() => authService),
    };
    const guard = new GrpcAuthGuard(authClient as any);
    guard.onModuleInit();

    await expect(
      guard.canActivate(
        createContext({
          headers: { authorization: 'Bearer bad-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws service unavailable when auth service call fails', async () => {
    const authService = {
      verifyAccessToken: jest.fn(() =>
        throwError(() => new Error('auth grpc is down')),
      ),
    };
    const authClient = {
      getService: jest.fn(() => authService),
    };
    const guard = new GrpcAuthGuard(authClient as any);
    guard.onModuleInit();

    await expect(
      guard.canActivate(
        createContext({
          headers: { authorization: 'Bearer any-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
