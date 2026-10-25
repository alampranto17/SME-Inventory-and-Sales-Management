import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationQueryDto {
  // ?unreadOnly=true  -> query values are strings, so we convert "true" to true
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}
