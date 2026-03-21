import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

type PinoTransportTarget = {
  target: string;
  options?: Record<string, unknown>;
  level?: string;
};

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const environment =
          config.get<'development' | 'test' | 'production'>('NODE_ENV') ||
          'development';
        const isProduction = environment === 'production';
        const level = config.get<string>('LOG_LEVEL') || 'info';
        const logToFile = config.get<boolean>('LOG_TO_FILE', false);
        const logFilePath =
          config.get<string>('LOG_FILE_PATH') || 'logs/catalog-service.log';

        const transportTargets: PinoTransportTarget[] = [];

        if (!isProduction) {
          transportTargets.push({
            target: 'pino-pretty',
            options: {
              destination: 1,
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          });
        } else {
          // In production keep JSON logs in stdout.
          transportTargets.push({
            target: 'pino/file',
            options: {
              destination: 1,
            },
          });
        }

        if (logToFile) {
          transportTargets.push({
            target: 'pino/file',
            options: {
              destination: logFilePath,
              mkdir: true,
              append: true,
            },
          });
        }

        return {
          pinoHttp: {
            level,
            ...(transportTargets.length > 0
              ? {
                  transport: {
                    targets: transportTargets,
                  },
                }
              : {}),
            messageKey: 'message',
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const forwardedRequestId = Array.isArray(
                req.headers['x-request-id'],
              )
                ? req.headers['x-request-id'][0]
                : req.headers['x-request-id'];
              const correlationId = Array.isArray(
                req.headers['x-correlation-id'],
              )
                ? req.headers['x-correlation-id'][0]
                : req.headers['x-correlation-id'];
              const reqId = forwardedRequestId || correlationId || randomUUID();

              res.setHeader('x-request-id', reqId);
              return reqId;
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.headers["set-cookie"]',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
            customProps: () => ({
              service: config.get<string>('SERVICE_NAME') || 'base-service',
              environment,
            }),
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
