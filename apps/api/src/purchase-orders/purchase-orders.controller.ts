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
import { PurchaseOrderStatus, Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload, WarehouseScope } from '../auth/auth.types';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PurchaseOrderDto } from './dto/purchase-order.dto';
import { GoodsReceiptDto } from './dto/goods-receipt.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('purchase-orders')
@ApiBearerAuth('access-token')
@Controller('purchase-orders')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class PurchaseOrdersController {
  constructor(private readonly pos: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List purchase orders in scope',
    description:
      "Scope-filtered to the caller's warehouses. Filter by status/supplier/warehouse.",
  })
  @ApiOkResponse({ type: PurchaseOrderDto, isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentScope() scope: WarehouseScope,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<PurchaseOrderDto[]> {
    return this.pos.list(scope, {
      status: this.parseStatus(status),
      supplierId: supplierId || undefined,
      warehouseId: warehouseId || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a purchase order by id (within scope)' })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<PurchaseOrderDto> {
    return this.pos.findOne(scope, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create a purchase order (Draft)' })
  @ApiCreatedResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiValidationError()
  create(
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    return this.pos.create(scope, user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update a draft purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  update(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @Body() dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    return this.pos.update(scope, id, dto);
  }

  @Post(':id/send')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Send a draft PO to the supplier (Draft → Sent)' })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  send(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    return this.pos.send(scope, user.sub, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Approve a sent PO (Sent → Approved)' })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  approve(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    return this.pos.approve(scope, user.sub, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Cancel a Draft/Sent PO' })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  cancel(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    return this.pos.cancel(scope, user.sub, id);
  }

  @Post(':id/close')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Close out a Partially Received PO (short-ship → Completed)',
    description:
      'Terminal transition for a PO the supplier will not fully deliver.',
  })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiOkResponse({ type: PurchaseOrderDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  close(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    return this.pos.close(scope, user.sub, id);
  }

  @Post(':id/receipts')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Receive goods against a PO',
    description:
      'Records a delivery: updates line received/damaged, writes RECEIVE movements (sound→available, damaged→damaged), advances PO status — all in one transaction.',
  })
  @ApiParam({ name: 'id', description: 'Purchase order id (UUID).' })
  @ApiCreatedResponse({ type: GoodsReceiptDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  receive(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReceiveGoodsDto,
  ): Promise<GoodsReceiptDto> {
    return this.pos.receive(scope, user.sub, id, dto);
  }

  private parseStatus(raw?: string): PurchaseOrderStatus | undefined {
    if (!raw) return undefined;
    if (!(raw in PurchaseOrderStatus)) {
      throw new BadRequestException(`Unknown status: ${raw}`);
    }
    return raw as PurchaseOrderStatus;
  }
}
