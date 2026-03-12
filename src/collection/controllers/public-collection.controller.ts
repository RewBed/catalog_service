import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CollectionService } from '../collection.service';
import { PublicCollectionDto } from '../dto/public-collection.dto';

@Controller('api/collections')
@ApiTags('Collections')
export class PublicCollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @ApiOperation({
    operationId: 'getPublicCollectionByIdAndBranchId',
    summary: 'Get collection with branch products',
    description:
      'Returns collection data and only active branch products from this collection for the requested branch.',
  })
  @ApiParam({
    name: 'collectionId',
    type: Number,
    description: 'Collection id',
    example: 1,
  })
  @ApiParam({
    name: 'branchId',
    type: Number,
    description: 'Branch id',
    example: 5,
  })
  @ApiBadRequestResponse({ description: 'Invalid collectionId or branchId' })
  @ApiNotFoundResponse({ description: 'Collection or branch not found' })
  @ApiOkResponse({
    description: 'Collection data with nested branch products',
    type: PublicCollectionDto,
    links: {
      getBranchProductByIdFromCollection: {
        operationId: 'getPublicBranchProductById',
        parameters: {
          id: '$response.body#/products/0/id',
        },
      },
      getBranchProductBySlugFromCollection: {
        operationId: 'getPublicBranchProductBySlug',
        parameters: {
          slug: '$response.body#/products/0/slug',
          branchId: '$request.path.branchId',
        },
      },
      getVariantGroupsFromCollectionProduct: {
        operationId: 'getPublicProductVariantGroups',
        parameters: {
          productId: '$response.body#/products/0/productId',
        },
      },
    },
  })
  @Get(':collectionId/branches/:branchId')
  async getItem(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ): Promise<PublicCollectionDto> {
    const collection = await this.collectionService.getPublicItem(
      collectionId,
      branchId,
    );

    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

    return collection;
  }
}
