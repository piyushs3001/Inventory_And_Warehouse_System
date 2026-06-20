import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import type { WarehouseScope } from '../auth/auth.types';
import { ReportsService } from './reports.service';
import { ReportDto } from './dto/report.dto';
import { ApiAuthErrors } from '../common/decorators/api-errors.decorators';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
@Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':type')
  @ApiOperation({
    summary: 'Run a report (inventory | purchase | warehouse), scope-filtered',
  })
  @ApiParam({ name: 'type', enum: ['inventory', 'purchase', 'warehouse'] })
  @ApiOkResponse({ type: ReportDto })
  @ApiAuthErrors()
  run(
    @Param('type') type: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<ReportDto> {
    return this.reports.build(this.reports.parseType(type), scope);
  }

  @Get(':type/export')
  @ApiOperation({
    summary: 'Export a report as CSV (download)',
    description:
      'PDF/Excel export is deferred pending object storage; CSV is generated inline.',
  })
  @ApiParam({ name: 'type', enum: ['inventory', 'purchase', 'warehouse'] })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'CSV file', type: String })
  @ApiAuthErrors()
  async export(
    @Param('type') type: string,
    @CurrentScope() scope: WarehouseScope,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const reportType = this.reports.parseType(type);
    const report = await this.reports.build(reportType, scope);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${reportType}-report.csv"`,
    });
    return this.reports.toCsv(report);
  }
}
