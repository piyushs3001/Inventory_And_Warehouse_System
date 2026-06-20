import {
  BadRequestException,
  Controller,
  Get,
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
import { MovementType } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import type { WarehouseScope } from '../auth/auth.types';
import { MovementsService } from './movements.service';
import { MovementListDto } from './dto/stock-movement.dto';
import { ApiUnauthorizedTokenError } from '../common/decorators/api-errors.decorators';

const MAX_PAGE_SIZE = 100;

@ApiTags('movements')
@ApiBearerAuth('access-token')
@Controller('movements')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse the stock movement ledger (immutable, scope-filtered)',
    description:
      "Append-only quantity ledger within the caller's scope. Filter by product, warehouse, type and date range. Paginated, newest first.",
  })
  @ApiOkResponse({ type: MovementListDto })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: MovementType })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date/time lower bound.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date/time upper bound.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<MovementListDto> {
    return this.movements.list(scope, {
      productId: productId || undefined,
      warehouseId: warehouseId || undefined,
      type: this.parseType(type),
      from: from || undefined,
      to: to || undefined,
      page: this.parsePage(page),
      pageSize: this.parsePageSize(pageSize),
    });
  }

  private parseType(raw?: string): MovementType | undefined {
    if (!raw) return undefined;
    if (!(raw in MovementType)) {
      throw new BadRequestException(`Unknown movement type: ${raw}`);
    }
    return raw as MovementType;
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
