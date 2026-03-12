import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { HealthDto } from './dto/health.dto';
import { HealthPaginationDto } from './dto/health.pagination.dto';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @ApiOperation({
        operationId: 'healthLive',
        summary: 'Liveness probe',
        description: 'Checks that service process is alive.',
    })
    @ApiOkResponse({
        description: 'Service is alive',
        schema: {
            example: {
                status: 'ok',
            },
        },
    })
    @Get('live')
    live() {
        // Простая проверка того, что сервис жив
        return { status: 'ok' };
    }

    @ApiOperation({
        operationId: 'healthReady',
        summary: 'Readiness probe',
        description: 'Checks that service can access database.',
    })
    @ApiOkResponse({
        description: 'Service is ready',
        schema: {
            example: {
                status: 'ok',
            },
        },
    })
    @ApiServiceUnavailableResponse({
        description: 'Database is not ready',
        schema: {
            example: {
                status: 'error',
                message: 'Database not ready',
            },
        },
    })
    @Get('ready')
    async ready() {
        try {
            // Проверяем соединение с базой
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ok' };
        } catch (err) {
            throw new HttpException(
                { status: 'error', message: 'Database not ready' },
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    @ApiOperation({
        operationId: 'healthIndex',
        summary: 'Health example list endpoint',
    })
    @ApiOkResponse({ type: HealthPaginationDto, description: 'Health list response' })
    @Get()
    async index(): Promise<HealthPaginationDto> {
        return {
            items: [],
            meta: {
                total: 1,
                page: 1,
                limit: 1
            }
        }
    }

    @ApiOperation({
        operationId: 'healthCreate',
        summary: 'Health example create endpoint',
    })
    @ApiCreatedResponse({
        description: 'Echo payload result',
        schema: {
            example: {
                dtoStr: 'test-value',
            },
        },
    })
    @Post()
    create(@Body() dto: HealthDto) {
        return {
            dtoStr: dto.test
        }
    }
}
