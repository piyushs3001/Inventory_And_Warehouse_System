import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantDto } from './dto/variant.dto';
import { BarcodeDto } from '../barcodes/dto/barcode.dto';
import { BarcodeQueryDto } from '../barcodes/dto/barcode-query.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('variants')
@ApiBearerAuth('access-token')
@Controller('products/:productId/variants')
@UseGuards(JwtAccessGuard, RolesGuard)
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @ApiOperation({
    summary: 'List variants of a product',
    description: 'Available to any authenticated user.',
  })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: VariantDto, isArray: true })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  list(
    @Param('productId') productId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<VariantDto[]> {
    return this.variants.list(productId, {
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a variant by id' })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiParam({ name: 'id', description: 'Variant id (UUID).' })
  @ApiOkResponse({ type: VariantDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Variant not found.',
  })
  findOne(
    @Param('productId') productId: string,
    @Param('id') id: string,
  ): Promise<VariantDto> {
    return this.variants.findOne(productId, id);
  }

  @Get(':id/barcode')
  @ApiOperation({
    summary: 'Generate a barcode for a variant',
    description:
      'Renders the variant barcode (or SKU) as a PNG (code128 or qr) data URI.',
  })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiParam({ name: 'id', description: 'Variant id (UUID).' })
  @ApiOkResponse({ type: BarcodeDto })
  @ApiUnauthorizedTokenError()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Variant not found.',
  })
  barcode(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Query() query: BarcodeQueryDto,
  ): Promise<BarcodeDto> {
    return this.variants.barcode(productId, id, query.symbology);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create a variant' })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiCreatedResponse({ type: VariantDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The SKU is already used by a product or variant.',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ): Promise<VariantDto> {
    return this.variants.create(user.sub, productId, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update a variant' })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiParam({ name: 'id', description: 'Variant id (UUID).' })
  @ApiOkResponse({ type: VariantDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Variant not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The SKU is already used by a product or variant.',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<VariantDto> {
    return this.variants.update(user.sub, productId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Archive a variant',
    description: 'Soft-deletes the variant (status → ARCHIVED).',
  })
  @ApiParam({ name: 'productId', description: 'Product id (UUID).' })
  @ApiParam({ name: 'id', description: 'Variant id (UUID).' })
  @ApiOkResponse({ type: VariantDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Variant not found.',
  })
  archive(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Param('id') id: string,
  ): Promise<VariantDto> {
    return this.variants.archive(user.sub, productId, id);
  }
}
