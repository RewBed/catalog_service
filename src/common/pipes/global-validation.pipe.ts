import { ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';

export function createGlobalValidationPipe(): ValidationPipe {
    return new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
            const formattedErrors = errors.reduce((acc, err) => {
                acc[err.property] = Object.values(err.constraints || {});
                return acc;
            }, {} as Record<string, string[]>);

            return new BadRequestException({
                statusCode: 400,
                error: 'Bad Request',
                message: formattedErrors,
            });
        },
    });
}
