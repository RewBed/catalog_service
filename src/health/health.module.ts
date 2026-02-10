import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthGrpcController } from './health.grpc.controller';

@Module({
    controllers: [HealthController, HealthGrpcController],
})
export class HealthModule {}
