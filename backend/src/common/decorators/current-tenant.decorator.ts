import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenants = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // console.log('tenants : ', request.tenants);
    return request.tenant;
  },
);
