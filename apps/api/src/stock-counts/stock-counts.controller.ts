import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
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
import { Role, StockCountStatus } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload, WarehouseScope } from '../auth/auth.types';
import { StockCountsService } from './stock-counts.service';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { EnterCountsDto } from './dto/enter-counts.dto';
import { StockCountDto } from './dto/stock-count.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('stock-counts')
@ApiBearerAuth('access-token')
@Controller('stock-counts')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class StockCountsController {
  constructor(private readonly counts: StockCountsService) {}

  @Get()
  @ApiOperation({ summary: 'List stock counts in scope' })
  @ApiOkResponse({ type: StockCountDto, isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: StockCountStatus })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<StockCountDto[]> {
    return this.counts.list(scope, {
      status: this.parseStatus(status),
      warehouseId: warehouseId || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock count (with per-line variance)' })
  @ApiParam({ name: 'id', description: 'Stock count id (UUID).' })
  @ApiOkResponse({ type: StockCountDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<StockCountDto> {
    return this.counts.findOne(scope, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Open a count session (snapshots system available per product)',
  })
  @ApiCreatedResponse({ type: StockCountDto })
  @ApiAuthErrors()
  @ApiValidationError()
  create(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStockCountDto,
  ): Promise<StockCountDto> {
    return this.counts.create(scope, user.sub, dto);
  }

  @Patch(':id/counts')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Enter counted quantities for an open session' })
  @ApiParam({ name: 'id', description: 'Stock count id (UUID).' })
  @ApiOkResponse({ type: StockCountDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  enterCounts(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @Body() dto: EnterCountsDto,
  ): Promise<StockCountDto> {
    return this.counts.enterCounts(scope, id, dto);
  }

  @Post(':id/reconcile')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Reconcile a count — write Adjustment movements to match physical',
  })
  @ApiParam({ name: 'id', description: 'Stock count id (UUID).' })
  @ApiOkResponse({ type: StockCountDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  reconcile(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockCountDto> {
    return this.counts.reconcile(scope, user.sub, id);
  }

  private parseStatus(raw?: string): StockCountStatus | undefined {
    if (!raw) return undefined;
    if (!(raw in StockCountStatus)) {
      throw new BadRequestException(`Unknown status: ${raw}`);
    }
    return raw as StockCountStatus;
  }
}
