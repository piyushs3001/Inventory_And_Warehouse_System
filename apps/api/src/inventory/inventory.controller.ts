import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload, WarehouseScope } from '../auth/auth.types';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryItemDto, InventoryListDto } from './dto/inventory-item.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';

const MAX_PAGE_SIZE = 100;

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List inventory (four buckets per SKU) within scope',
    description:
      'Scope-filtered stock per (product x warehouse). Any authenticated user; staff see only their assigned warehouses. Paginated.',
  })
  @ApiOkResponse({ type: InventoryListDto })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<InventoryListDto> {
    return this.inventory.list(scope, {
      warehouseId: warehouseId || undefined,
      productId: productId || undefined,
      search: search || undefined,
      lowStockOnly: lowStock === 'true',
      page: this.parsePage(page),
      pageSize: this.parsePageSize(pageSize),
    });
  }

  @Post('adjust')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Adjust a stock bucket (reason required)',
    description:
      'Applies a signed change to the available or damaged bucket and writes an ADJUSTMENT movement in the same transaction.',
  })
  @ApiOkResponse({ type: InventoryItemDto })
  @ApiAuthErrors()
  @ApiValidationError()
  adjust(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdjustStockDto,
  ): Promise<InventoryItemDto> {
    return this.inventory.adjust(scope, user.sub, dto);
  }

  @Post('reserve')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Reserve stock (available -> reserved)',
    description:
      'Moves units from available to reserved within the same warehouse and writes a movement. Stock is not removed from the warehouse.',
  })
  @ApiOkResponse({ type: InventoryItemDto })
  @ApiAuthErrors()
  @ApiValidationError()
  reserve(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReserveStockDto,
  ): Promise<InventoryItemDto> {
    return this.inventory.reserve(scope, user.sub, dto);
  }

  private parsePage(raw?: string): number {
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }

  private parsePageSize(raw?: string): number {
    const n = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(n) || n < 1) return 20;
    return Math.min(n, MAX_PAGE_SIZE);
  }
}
