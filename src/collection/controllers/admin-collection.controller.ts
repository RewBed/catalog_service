import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/auth';
import { CollectionService } from '../collection.service';
import { AdminCollectionDto } from '../dto/admin/admin-collection.dto';
import { AdminCollectionPaginationDto } from '../dto/admin/admin-collection.pagination.dto';
import { AdminFilterCollectionDto } from '../dto/admin/admin-filter.collection.dto';
import { CreateCollectionDto } from '../dto/create.collection.dto';
import { UpdateCollectionDto } from '../dto/update.collection.dto';

@Controller('api/admin/collections')
@ApiTags('Admin Collections')
export class AdminCollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @ApiOperation({
    operationId: 'getAdminCollections',
    summary: 'Get collections list (admin)',
    description:
      'Returns collections with optional filters and pagination. Includes linked product previews and soft-delete filtering.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(GrpcAuthGuard)
  @ApiBadRequestResponse({ description: 'Validation failed for query params' })
  @ApiOkResponse({
    description: 'Collections page for admin',
    type: AdminCollectionPaginationDto,
    links: {
      getAdminCollectionByIdFromList: {
        operationId: 'getAdminCollectionById',
        parameters: {
          id: '$response.body#/items/0/id',
        },
      },
      getPublicCollectionForBranchFromAdminList: {
        operationId: 'getPublicCollectionByIdAndBranchId',
        parameters: {
          collectionId: '$response.body#/items/0/id',
          branchId: 1,
        },
      },
    },
  })
  @Get()
  async index(
    @Query() query: AdminFilterCollectionDto,
  ): Promise<AdminCollectionPaginationDto> {
    return this.collectionService.getAllAdmin(query);
  }

  @ApiOperation({
    operationId: 'getAdminCollectionById',
    summary: 'Get collection by id (admin)',
    description:
      'Returns collection details with linked product ids and product previews.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(GrpcAuthGuard)
  @ApiParam({ name: 'id', type: Number, description: 'Collection id', example: 1 })
  @ApiBadRequestResponse({ description: 'Invalid collection id' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  @ApiOkResponse({
    description: 'Collection details for admin',
    type: AdminCollectionDto,
    links: {
      getPublicCollectionForBranchFromAdminItem: {
        operationId: 'getPublicCollectionByIdAndBranchId',
        parameters: {
          collectionId: '$response.body#/id',
          branchId: 1,
        },
      },
    },
  })
  @Get(':id')
  async getItem(@Param('id', ParseIntPipe) id: number): Promise<AdminCollectionDto> {
    const collection = await this.collectionService.getItemAdmin(id);

    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }

    return collection;
  }

  @ApiOperation({
    operationId: 'createAdminCollection',
    summary: 'Create collection (admin)',
    description:
      'Creates a product collection with title, description and optional ordered productIds.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(GrpcAuthGuard)
  @ApiBadRequestResponse({ description: 'Validation failed for request body' })
  @ApiNotFoundResponse({ description: 'One or more products from productIds not found' })
  @ApiConflictResponse({ description: 'Collection relation conflict' })
  @ApiCreatedResponse({
    description: 'Collection created',
    type: AdminCollectionDto,
    links: {
      getCreatedAdminCollection: {
        operationId: 'getAdminCollectionById',
        parameters: {
          id: '$response.body#/id',
        },
      },
      updateCreatedAdminCollection: {
        operationId: 'updateAdminCollection',
        parameters: {
          id: '$response.body#/id',
        },
      },
      deleteCreatedAdminCollection: {
        operationId: 'deleteAdminCollection',
        parameters: {
          id: '$response.body#/id',
        },
      },
      getCreatedCollectionForBranch: {
        operationId: 'getPublicCollectionByIdAndBranchId',
        parameters: {
          collectionId: '$response.body#/id',
          branchId: 1,
        },
      },
    },
  })
  @Post()
  async create(@Body() payload: CreateCollectionDto): Promise<AdminCollectionDto> {
    return this.collectionService.create(payload);
  }

  @ApiOperation({
    operationId: 'updateAdminCollection',
    summary: 'Update collection (admin)',
    description:
      'Updates title/description and optionally fully replaces ordered productIds.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(GrpcAuthGuard)
  @ApiParam({ name: 'id', type: Number, description: 'Collection id', example: 1 })
  @ApiBadRequestResponse({
    description: 'Invalid collection id or validation failed for request body',
  })
  @ApiNotFoundResponse({
    description: 'Collection not found or one or more products not found',
  })
  @ApiConflictResponse({ description: 'Collection relation conflict' })
  @ApiOkResponse({
    description: 'Collection updated',
    type: AdminCollectionDto,
    links: {
      getUpdatedAdminCollection: {
        operationId: 'getAdminCollectionById',
        parameters: {
          id: '$response.body#/id',
        },
      },
      getUpdatedCollectionForBranch: {
        operationId: 'getPublicCollectionByIdAndBranchId',
        parameters: {
          collectionId: '$response.body#/id',
          branchId: 1,
        },
      },
    },
  })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCollectionDto,
  ): Promise<AdminCollectionDto> {
    return this.collectionService.update(id, payload);
  }

  @ApiOperation({
    operationId: 'deleteAdminCollection',
    summary: 'Delete collection (admin)',
    description: 'Soft-deletes a collection by setting deletedAt timestamp.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(GrpcAuthGuard)
  @ApiParam({ name: 'id', type: Number, description: 'Collection id', example: 1 })
  @ApiBadRequestResponse({ description: 'Invalid collection id' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  @ApiNoContentResponse({ description: 'Collection deleted' })
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.collectionService.remove(id);
  }
}
