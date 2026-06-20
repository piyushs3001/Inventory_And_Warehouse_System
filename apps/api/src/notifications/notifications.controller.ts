import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notification.dto';
import { ApiUnauthorizedTokenError } from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's notifications (newest first)" })
  @ApiOkResponse({ type: NotificationDto, isArray: true })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiUnauthorizedTokenError()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationDto[]> {
    return this.notifications.listForUser(user.sub, unreadOnly === 'true');
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of your notifications as read' })
  @ApiParam({ name: 'id', description: 'Notification id (UUID).' })
  @ApiOkResponse({ type: NotificationDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Not found (or not yours).',
  })
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationDto> {
    return this.notifications.markRead(user.sub, id);
  }
}
