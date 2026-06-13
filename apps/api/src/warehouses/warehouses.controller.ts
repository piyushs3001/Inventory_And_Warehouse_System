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
  ApiOkResponse,
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

@ApiTags('warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiOkResponse({ type: WarehouseDto, isArray: true })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<WarehouseDto[]> {
    return this.warehouses.list(scope, {
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @ApiOkResponse({ type: WarehouseDto })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<WarehouseDto> {
    return this.warehouses.findOne(id, scope);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiCreatedResponse({ type: WarehouseDto })
  create(@Body() dto: CreateWarehouseDto): Promise<WarehouseDto> {
    return this.warehouses.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOkResponse({ type: WarehouseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseDto> {
    return this.warehouses.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOkResponse({ type: WarehouseDto })
  archive(@Param('id') id: string): Promise<WarehouseDto> {
    return this.warehouses.archive(id);
  }

  @Post(':id/staff')
  @Roles(Role.SUPER_ADMIN)
  @ApiCreatedResponse({ type: WarehouseDto })
  assignStaff(
    @Param('id') id: string,
    @Body() dto: AssignStaffDto,
  ): Promise<WarehouseDto> {
    return this.warehouses.assignStaff(id, dto);
  }
}
