import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { BarcodeDto } from '../barcodes/dto/barcode.dto';
import { BarcodeQueryDto } from '../barcodes/dto/barcode-query.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller('products')
@UseGuards(JwtAccessGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List products',
    description: 'Global catalog; available to any authenticated user.',
  })
  @ApiOkResponse({ type: ProductDto, isArray: true })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiUnauthorizedTokenError()
  list(
    @Query('includeArchived') includeArchived?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ): Promise<ProductDto[]> {
    return this.products.list({
      includeArchived: includeArchived === 'true',
      categoryId: categoryId || undefined,
      search: search || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: ProductDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.products.findOne(id);
  }

  @Get(':id/barcode')
  @ApiOperation({
    summary: 'Generate a barcode for a product',
    description: 'Renders the product SKU as a PNG (code128 or qr) data URI.',
  })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: BarcodeDto })
  @ApiUnauthorizedTokenError()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  barcode(
    @Param('id') id: string,
    @Query() query: BarcodeQueryDto,
  ): Promise<BarcodeDto> {
    return this.products.barcode(id, query.symbology);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A product with this SKU already exists.',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ): Promise<ProductDto> {
    return this.products.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: ProductDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A product with this SKU already exists.',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.products.update(user.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Archive a product',
    description: 'Soft-deletes the product (status → ARCHIVED).',
  })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: ProductDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ProductDto> {
    return this.products.archive(user.sub, id);
  }

  @Post(':id/image')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload or replace the product image',
    description:
      'Accepts a single image file (image/*, ≤ 5 MB). If the product already has an image it is replaced.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: ProductDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  uploadImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ProductDto> {
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Only image/* files are accepted.`,
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must not exceed 5 MB.');
    }
    return this.products.uploadImage(user.sub, id, file);
  }

  @Delete(':id/image')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Remove the product image',
    description: 'Deletes the stored image file and clears imageUrl.',
  })
  @ApiParam({ name: 'id', description: 'Product id (UUID).' })
  @ApiOkResponse({ type: ProductDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Product not found.',
  })
  deleteImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ProductDto> {
    return this.products.deleteImage(user.sub, id);
  }
}
