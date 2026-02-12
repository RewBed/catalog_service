import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AUTH_SERVICE_GRPC } from './constants/auth.tokens';
import { GrpcAuthGuard } from './guards/grpc-auth.guard';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: AUTH_SERVICE_GRPC,
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        url: configService.getOrThrow<string>('AUTH_GRPC_URL'),
                        package: 'auth',
                        protoPath: join(process.cwd(), 'grpc/proto/auth.proto'),
                        loader: {
                            keepCase: false,
                        },
                    },
                }),
            },
        ]),
    ],
    providers: [GrpcAuthGuard],
    exports: [ClientsModule, GrpcAuthGuard],
})
export class AuthGrpcClientModule {}
