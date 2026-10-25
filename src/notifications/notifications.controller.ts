import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { ALL_TENANT_ROLES } from 'src/common/constants/roles.constants';
import { NotificationQueryDto } from './dto/notificationQuery.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('notifications')
@Roles(...ALL_TENANT_ROLES)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findMine(user, query.unreadOnly);
  }

  // must be ABOVE ':id/read', otherwise "read-all" is treated as an id
  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(user, id);
  }
}
