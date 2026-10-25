import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PusherService } from './pusher.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Controller('pusher')
export class PusherController {
  constructor(private readonly pusherService: PusherService) {}

  // pusher-js calls this automatically when the frontend subscribes
  // to a "private-..." channel. It sends: socket_id + channel_name
  // and the JWT token in the Authorization header.
  @Post('auth')
  // pusher-js only accepts status 200 here (Nest's default for POST is 201)
  @HttpCode(HttpStatus.OK)
  auth(
    @CurrentUser() user: AuthUser,
    @Body() body: { socket_id: string; channel_name: string },
    @Res() res: Response,
  ) {
    const channel = body.channel_name;

    // 1. only allow the user's OWN company channel or OWN user channel
    const allowedChannels = [
      this.pusherService.tenantChannel(user.tenantId),
      this.pusherService.userChannel(user.id),
    ];

    if (!allowedChannels.includes(channel)) {
      throw new ForbiddenException('You can not listen to this channel');
    }

    // 2. ask pusher library to sign the permission
    const authResponse = this.pusherService.authorizeChannel(
      body.socket_id,
      channel,
    );

    if (!authResponse) {
      throw new ServiceUnavailableException('Realtime is not configured');
    }

    // 3. pusher-js wants the raw object { auth: "..." }
    //    so we use res.send() and skip our normal { statusCode, data } wrapper
    res.status(HttpStatus.OK).send(authResponse);
  }
}
