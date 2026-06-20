import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CurrentScope } from '../auth/decorators/current-scope.decorator';
import type { WarehouseScope } from '../auth/auth.types';
import { PurchaseOrdersService } from './purchase-orders.service';
import { GoodsReceiptDto } from './dto/goods-receipt.dto';
import { ApiUnauthorizedTokenError } from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('receipts')
@ApiBearerAuth('access-token')
@Controller('receipts')
@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)
export class ReceiptsController {
  constructor(private readonly pos: PurchaseOrdersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a goods receipt by id (within scope)' })
  @ApiParam({ name: 'id', description: 'Goods receipt id (UUID).' })
  @ApiOkResponse({ type: GoodsReceiptDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found or out of scope.',
  })
  findOne(
    @Param('id') id: string,
    @CurrentScope() scope: WarehouseScope,
  ): Promise<GoodsReceiptDto> {
    return this.pos.getReceipt(scope, id);
  }
}
