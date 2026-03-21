import type { INestApplication } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { serializeUnknownError } from './logging.utils';

let handlersRegistered = false;

export function registerProcessErrorHandlers(
  logger: PinoLogger,
  app: INestApplication,
): void {
  if (handlersRegistered) {
    return;
  }

  handlersRegistered = true;
  logger.setContext('Process');

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    const forceExitTimer = setTimeout(() => {
      process.exit(1);
    }, 5000);
    forceExitTimer.unref?.();

    try {
      await app.close();
    } catch (closeError) {
      logger.error(
        { exception: serializeUnknownError(closeError) },
        'Failed to close app after uncaught exception',
      );
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('unhandledRejection', (reason) => {
    logger.error(
      { exception: serializeUnknownError(reason) },
      'Unhandled promise rejection',
    );
  });

  process.on('uncaughtException', (error, origin) => {
    logger.fatal(
      {
        origin,
        exception: serializeUnknownError(error),
      },
      'Uncaught exception',
    );

    void shutdown();
  });
}
