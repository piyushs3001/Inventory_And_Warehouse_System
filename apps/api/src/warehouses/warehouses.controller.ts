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
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import type { WarehouseScope } from '../auth/auth.types';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { WarehouseDto } from './dto/warehouse.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiOperation({
    summary: 'List warehouses in scope',
    description:
      "Returns warehouses within the caller's scope (Super Admin: all).",
  })
  @ApiOkResponse({ type: WarehouseDto, isArray: true })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<WarehouseDto[]> {
    return this.warehouses.list(scope, {
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a warehouse by id (within scope)' })
  @ApiParam({ name: 'id', description: 'Warehouse id (UUID).' })
  @ApiOkResponse({ type: WarehouseDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: "Not found, or outside the caller's scope (fail-closed).",
  })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<WarehouseDto> {
    return this.warehouses.findOne(id, scope);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiOperation({ summary: 'Create a warehouse' })
  @ApiCreatedResponse({ type: WarehouseDto })
  create(@Body() dto: CreateWarehouseDto): Promise<WarehouseDto> {
    return this.warehouses.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse id (UUID).' })
  @ApiOkResponse({ type: WarehouseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Warehouse not found.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseDto> {
    return this.warehouses.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiOperation({
    summary: 'Archive a warehouse',
    description: 'Soft-deletes the warehouse (status => INACTIVE).',
  })
  @ApiParam({ name: 'id', description: 'Warehouse id (UUID).' })
  @ApiOkResponse({ type: WarehouseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Warehouse not found.',
  })
  archive(@Param('id') id: string): Promise<WarehouseDto> {
    return this.warehouses.archive(id);
  }

  @Post(':id/staff')
  @Roles(Role.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiOperation({ summary: 'Assign staff to a warehouse (sets their scope)' })
  @ApiParam({ name: 'id', description: 'Warehouse id (UUID).' })
  @ApiCreatedResponse({ type: WarehouseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Warehouse not found.',
  })
  assignStaff(
    @Param('id') id: string,
    @Body() dto: AssignStaffDto,
  ): Promise<WarehouseDto> {
    return this.warehouses.assignStaff(id, dto);
  }
}
