import { Buffer } from 'node:buffer';

type SerializableError = {
  name?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
};

type GrpcMetadataLike = {
  getMap?: () => Record<string, unknown>;
};

export function serializeUnknownError(exception: unknown): unknown {
  if (exception instanceof Error) {
    const payload: SerializableError = {
      name: exception.name,
      message: exception.message,
      stack: exception.stack,
    };

    const cause = (exception as Error & { cause?: unknown }).cause;
    if (cause !== undefined) {
      payload.cause = serializeUnknownError(cause);
    }

    return payload;
  }

  if (Buffer.isBuffer(exception)) {
    return {
      type: 'Buffer',
      byteLength: exception.byteLength,
      preview: exception.toString(
        'utf-8',
        0,
        Math.min(exception.byteLength, 200),
      ),
    };
  }

  if (typeof exception === 'object' && exception !== null) {
    return exception;
  }

  return {
    value: String(exception),
  };
}

export function serializeRpcContext(context: unknown): unknown {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  const metadata =
    typeof (context as GrpcMetadataLike).getMap === 'function'
      ? (context as GrpcMetadataLike).getMap?.()
      : typeof (context as { metadata?: GrpcMetadataLike }).metadata?.getMap ===
          'function'
        ? (context as { metadata: GrpcMetadataLike }).metadata.getMap?.()
        : undefined;

  if (!metadata || Object.keys(metadata).length === 0) {
    return undefined;
  }

  return { metadata };
}
