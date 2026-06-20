import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import type { WarehouseScope } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';
import { DashboardDto } from './dto/dashboard.dto';
import { ApiUnauthorizedTokenError } from '../common/decorators/api-errors.decorators';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Role/scope-aware dashboard KPIs',
    description:
      'All figures are filtered to the caller scope (Super Admin: global; others: assigned warehouses).',
  })
  @ApiOkResponse({ type: DashboardDto })
  @ApiUnauthorizedTokenError()
  get(@CurrentScope() scope: WarehouseScope): Promise<DashboardDto> {
    return this.dashboard.get(scope);
  }
}
