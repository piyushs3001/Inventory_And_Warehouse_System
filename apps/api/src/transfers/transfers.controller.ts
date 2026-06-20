import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { Role, StockTransferStatus } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload, WarehouseScope } from '../auth/auth.types';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferDto } from './dto/transfer.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('transfers')
@ApiBearerAuth('access-token')
@Controller('transfers')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  @ApiOperation({
    summary: 'List transfers in scope',
    description:
      'Visible when the caller has scope over the source OR destination warehouse.',
  })
  @ApiOkResponse({ type: TransferDto, isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: StockTransferStatus })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('status') status?: string,
  ): Promise<TransferDto[]> {
    return this.transfers.list(scope, { status: this.parseStatus(status) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transfer by id (within scope)' })
  @ApiParam({ name: 'id', description: 'Transfer id (UUID).' })
  @ApiOkResponse({ type: TransferDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<TransferDto> {
    return this.transfers.findOne(scope, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Request a transfer (source available → in-transit)',
  })
  @ApiCreatedResponse({ type: TransferDto })
  @ApiAuthErrors()
  @ApiValidationError()
  create(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferDto> {
    return this.transfers.create(scope, user.sub, dto);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Approve a requested transfer (source-scope required)',
  })
  @ApiParam({ name: 'id', description: 'Transfer id (UUID).' })
  @ApiOkResponse({ type: TransferDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  approve(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<TransferDto> {
    return this.transfers.approve(scope, user.sub, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Cancel a transfer (release the in-transit hold)' })
  @ApiParam({ name: 'id', description: 'Transfer id (UUID).' })
  @ApiOkResponse({ type: TransferDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  cancel(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<TransferDto> {
    return this.transfers.cancel(scope, user.sub, id);
  }

  @Post(':id/receive')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Receive an approved transfer (destination-scope required)',
    description:
      'Source in-transit cleared, destination available increased — one transaction, two Transfer movements per line.',
  })
  @ApiParam({ name: 'id', description: 'Transfer id (UUID).' })
  @ApiOkResponse({ type: TransferDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  receive(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<TransferDto> {
    return this.transfers.receive(scope, user.sub, id);
  }

  private parseStatus(raw?: string): StockTransferStatus | undefined {
    if (!raw) return undefined;
    if (!(raw in StockTransferStatus)) {
      throw new BadRequestException(`Unknown status: ${raw}`);
    }
    return raw as StockTransferStatus;
  }
}
