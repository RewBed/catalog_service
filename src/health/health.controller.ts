import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { HealthDto } from './dto/health.dto';
import { HealthPaginationDto } from './dto/health.pagination.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('live')
    live() {
        // Простая проверка того, что сервис жив
        return { status: 'ok' };
    }

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

    @ApiOkResponse({ type: HealthPaginationDto })
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

    @Post()
    create(@Body() dto: HealthDto) {
        return {
            dtoStr: dto.test
        }
    }
}
