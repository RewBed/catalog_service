import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

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
        const level = config.get<string>('LOG_LEVEL') || 'info';
        const logToFile = config.get<boolean>('LOG_TO_FILE', false);
        const logFilePath =
          config.get<string>('LOG_FILE_PATH') || 'logs/catalog-service.log';

        const transportTargets: PinoTransportTarget[] = [];

        if (process.env.NODE_ENV !== 'production') {
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
            customProps: () => ({
              service: config.get<string>('SERVICE_NAME') || 'base-service',
            }),
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
