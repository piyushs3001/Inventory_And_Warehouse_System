import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import { WarehouseRefDto } from './dto/warehouse-ref.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiOkResponse({ type: WarehouseRefDto, isArray: true })
  list(): Promise<WarehouseRefDto[]> {
    return this.warehouses.list();
  }
}
