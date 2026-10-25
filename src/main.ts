import { RolesGuard } from './common/Guards/user-role.guards';
import { JwtAuthGuard } from './auth/Guards/JwtAuth.Guard';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // every route starts with /api/v1  ->  /api/v1/products
  app.setGlobalPrefix('api/v1');

  // security headers.
  // "cross-origin" -> the frontend (port 3001) is allowed to show our images
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // make the "uploads" folder public: product photos are at /uploads/products/...
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // allow the Next.js frontend to call this API
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // same error shape everywhere: { statusCode, error, message }
  app.useGlobalFilters(new AllExceptionsFilter());

  const reflector = app.get(Reflector);

  // 1. ClassSerializerInterceptor -> removes @Exclude() fields (passwordHash)
  // 2. ResponseInterceptor        -> wraps result in { statusCode, message, data }
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
  );

  // 1. check token (skipped for @Public() routes)  2. check role (@Roles)
  // (the rate-limit guard is registered in app.module.ts)
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Swagger docs -> http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SME Inventory & Sales API')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer') // "Authorize" button works on all routes
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
