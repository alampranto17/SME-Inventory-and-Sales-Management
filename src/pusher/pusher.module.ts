import { Global, Module } from '@nestjs/common';
import { PusherService } from './pusher.service';
import { PusherController } from './pusher.controller';

// @Global() -> every module can inject PusherService
// without adding PusherModule to its imports.
@Global()
@Module({
  controllers: [PusherController],
  providers: [PusherService],
  exports: [PusherService],
})
export class PusherModule {}
