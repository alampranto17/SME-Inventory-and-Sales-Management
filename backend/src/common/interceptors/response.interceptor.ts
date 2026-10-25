import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

// Every successful response is wrapped like this:
// { statusCode: 200, message: 'Success', data: ... }
//
// In a service you can return:
//   return product;                                   -> message = 'Success'
//   return { message: 'Product created', data: product };  -> custom message
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((result) => {
        const hasData = result && result.data !== undefined;

        return {
          statusCode,
          message: result?.message ?? 'Success',
          data: hasData ? result.data : result,
        };
      }),
    );
  }
}
