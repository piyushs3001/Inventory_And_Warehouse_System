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
import { AiService } from './ai.service';
import { ReorderSuggestionDto } from './dto/reorder-suggestion.dto';
import { ForecastRequestDto, ForecastResultDto } from './dto/forecast.dto';
import {
  ChatRequestDto,
  ChatResponseDto,
  ReportSummaryDto,
  SummarizeRequestDto,
} from './dto/ai-text.dto';
import {
  GeneratePoRequestDto,
  GeneratePoResultDto,
} from './dto/generate-po.dto';
import type { ReportType } from '../reports/reports.service';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('reorder-suggestions')
  @ApiOperation({
    summary: 'Reorder suggestions (statistical, advisory — not auto-applied)',
    description:
      'Ranks low-stock products by projected days-to-stockout. Reproducible, no LLM.',
  })
  @ApiOkResponse({ type: ReorderSuggestionDto, isArray: true })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiUnauthorizedTokenError()
  reorder(
    @CurrentScope() scope: WarehouseScope,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<ReorderSuggestionDto[]> {
    return this.ai.reorderSuggestions(scope, warehouseId || undefined);
  }

  @Post('forecast')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Demand forecast (moving-average baseline, advisory)',
  })
  @ApiOkResponse({ type: ForecastResultDto })
  @ApiUnauthorizedTokenError()
  @ApiValidationError()
  forecast(
    @CurrentScope() scope: WarehouseScope,
    @Body() dto: ForecastRequestDto,
  ): Promise<ForecastResultDto> {
    return this.ai.forecast(scope, dto);
  }

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Chat assistant (RAG over scoped inventory; requires an LLM provider)',
  })
  @ApiOkResponse({ type: ChatResponseDto })
  @ApiUnauthorizedTokenError()
  @ApiValidationError()
  chat(
    @CurrentScope() scope: WarehouseScope,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.ai.chat(scope, dto);
  }

  @Post('summarize-report')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Plain-language summary of a report (figure-accurate)',
  })
  @ApiOkResponse({ type: ReportSummaryDto })
  @ApiAuthErrors()
  @ApiValidationError()
  summarize(
    @CurrentScope() scope: WarehouseScope,
    @Body() dto: SummarizeRequestDto,
  ): Promise<ReportSummaryDto> {
    return this.ai.summarizeReport(scope, dto.type as ReportType);
  }

  @Post('generate-po')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary:
      'Generate Draft POs from reorder suggestions (grouped by supplier)',
    description:
      'Creates Draft purchase orders only — a human reviews and sends. Nothing is sent automatically.',
  })
  @ApiOkResponse({ type: GeneratePoResultDto })
  @ApiAuthErrors()
  @ApiValidationError()
  generatePo(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GeneratePoRequestDto,
  ): Promise<GeneratePoResultDto> {
    return this.ai.generatePo(scope, user.sub, dto);
  }
}
