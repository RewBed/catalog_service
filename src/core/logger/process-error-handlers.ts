import type { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { serializeUnknownError } from './logging.utils';

let handlersRegistered = false;

export function registerProcessErrorHandlers(
  logger: Logger,
  app: INestApplication,
): void {
  if (handlersRegistered) {
    return;
  }

  handlersRegistered = true;

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
        'Process',
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
      'Process',
    );
  });

  process.on('uncaughtException', (error, origin) => {
    logger.fatal(
      {
        origin,
        exception: serializeUnknownError(error),
      },
      'Uncaught exception',
      'Process',
    );

    void shutdown();
  });
}
