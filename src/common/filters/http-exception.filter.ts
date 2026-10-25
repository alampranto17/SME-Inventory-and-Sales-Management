import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

// This filter catches EVERY error in the app and sends it back
// in the same shape:  { statusCode, error, message }
// So the frontend only needs one piece of code to show errors.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // 1. Normal NestJS errors (NotFoundException, BadRequestException ...)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse() as any;
      message = response.message || exception.message;
    }
    // 2. Database errors from PostgreSQL
    else if (exception instanceof QueryFailedError) {
      const code = (exception as any).code;
      if (code === '23505') {
        // unique_violation -> duplicate data
        status = HttpStatus.CONFLICT;
        message = 'This record already exists';
      } else if (code === '22P02') {
        // invalid_text_representation -> e.g. bad uuid
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid id or value format';
      } else {
        this.logger.error(exception.message);
      }
    }
    // 3. Anything else is a bug -> log it so we can fix it
    else {
      this.logger.error(exception);
    }

    res.status(status).json({
      statusCode: status,
      error: (HttpStatus[status] ?? 'ERROR').replace(/_/g, ' '),
      // ValidationPipe sends an array of messages, we show the first one
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
