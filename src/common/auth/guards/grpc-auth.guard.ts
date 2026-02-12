import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    OnModuleInit,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { AUTH_SERVICE_GRPC } from '../constants/auth.tokens';

interface VerifyAccessTokenRequest {
    accessToken: string;
}

interface VerifyAccessTokenResponse {
    valid: boolean;
    userId: string;
    username: string;
    role: string;
    message: string;
}

interface AuthServiceGrpc {
    verifyAccessToken(data: VerifyAccessTokenRequest): Observable<VerifyAccessTokenResponse>;
}

type AuthenticatedRequest = Request & {
    user?: {
        userId: string;
        username: string;
        role: string;
    };
};

@Injectable()
export class GrpcAuthGuard implements CanActivate, OnModuleInit {
    private authService!: AuthServiceGrpc;

    constructor(@Inject(AUTH_SERVICE_GRPC) private readonly authClient: ClientGrpc) {}

    onModuleInit(): void {
        this.authService = this.authClient.getService<AuthServiceGrpc>('AuthService');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const token = this.extractBearerToken(request);

        if (!token) {
            throw new UnauthorizedException('Access token is missing');
        }

        try {
            const response = await firstValueFrom(
                this.authService.verifyAccessToken({ accessToken: token }).pipe(timeout(500)),
            );

            if (!response.valid) {
                throw new UnauthorizedException(response.message || 'Invalid access token');
            }

            request.user = {
                userId: response.userId,
                username: response.username,
                role: response.role,
            };

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new ServiceUnavailableException('Authorization service is unavailable');
        }
    }

    private extractBearerToken(request: Request): string | null {
        const authorizationHeader = request.headers.authorization;
        if (!authorizationHeader) {
            return null;
        }

        const [scheme, token] = authorizationHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            return null;
        }

        return token;
    }
}
