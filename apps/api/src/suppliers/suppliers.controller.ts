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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierDto } from './dto/supplier.dto';
import { SupplierPerformanceDto } from './dto/supplier-performance.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('suppliers')
@ApiBearerAuth('access-token')
@Controller('suppliers')
@UseGuards(JwtAccessGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary: 'List suppliers',
    description: 'Global reference data; available to any authenticated user.',
  })
  @ApiOkResponse({ type: SupplierDto, isArray: true })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiUnauthorizedTokenError()
  list(
    @Query('includeInactive') includeInactive?: string,
    @Query('search') search?: string,
  ): Promise<SupplierDto[]> {
    return this.suppliers.list({
      includeInactive: includeInactive === 'true',
      search: search || undefined,
    });
  }

  @Get(':id/performance')
  @ApiOperation({
    summary: 'Supplier performance metrics (from PO/receipt history)',
  })
  @ApiParam({ name: 'id', description: 'Supplier id (UUID).' })
  @ApiOkResponse({ type: SupplierPerformanceDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Supplier not found.',
  })
  performance(@Param('id') id: string): Promise<SupplierPerformanceDto> {
    return this.suppliers.performance(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by id' })
  @ApiParam({ name: 'id', description: 'Supplier id (UUID).' })
  @ApiOkResponse({ type: SupplierDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Supplier not found.',
  })
  findOne(@Param('id') id: string): Promise<SupplierDto> {
    return this.suppliers.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiCreatedResponse({ type: SupplierDto })
  @ApiAuthErrors()
  @ApiValidationError()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierDto> {
    return this.suppliers.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier id (UUID).' })
  @ApiOkResponse({ type: SupplierDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Supplier not found.',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierDto> {
    return this.suppliers.update(user.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Deactivate a supplier',
    description:
      'Soft-delete (status → INACTIVE); purchase history is preserved.',
  })
  @ApiParam({ name: 'id', description: 'Supplier id (UUID).' })
  @ApiOkResponse({ type: SupplierDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Supplier not found.',
  })
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SupplierDto> {
    return this.suppliers.deactivate(user.sub, id);
  }
}
