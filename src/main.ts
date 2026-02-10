import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createGlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);

    // Подключаем глобальный валидатор
    app.useGlobalPipes(createGlobalValidationPipe());

    app.enableShutdownHooks();

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'health',
            protoPath: join(process.cwd(), 'grpc/proto/health.proto'),
            url: `0.0.0.0:${configService.get<number>('GRPC_PORT')}`,
        },
    });

      // Swagger
    const config = new DocumentBuilder()
        .setTitle('Base Service API')
        .setDescription('REST API + GRPC endpoints')
        .setVersion('1.0')
        .addServer(`http://localhost:${configService.get<number>('SERVICE_PORT')}`) // для dev
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document); // доступ по /docs

    // Генерация openapi.json
    const fs = require('fs');
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

    app.startAllMicroservices();  

    await app.listen(configService.get<number>('SERVICE_PORT') || 3000);
}
bootstrap();
