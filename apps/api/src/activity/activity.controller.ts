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
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityService } from './activity.service';
import { ActivityLogListDto } from './dto/activity-log.dto';
import { ApiAuthErrors } from '../common/decorators/api-errors.decorators';

const MAX_PAGE_SIZE = 100;

@ApiTags('activity-logs')
@ApiBearerAuth('access-token')
@Controller('activity-logs')
@UseGuards(JwtAccessGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Browse the activity log (Super Admin — global audit, read-only)',
  })
  @ApiOkResponse({ type: ActivityLogListDto })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiAuthErrors()
  list(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ActivityLogListDto> {
    return this.activity.list({
      userId: userId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      from: this.parseDate(from, 'from'),
      to: this.parseDate(to, 'to'),
      page: this.parsePage(page),
      pageSize: this.parsePageSize(pageSize),
    });
  }

  private parseDate(raw: string | undefined, label: string): Date | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid "${label}" date`);
    }
    return d;
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
