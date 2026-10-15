import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Project } from './projects/project.entity';
import { Task } from './tasks/task.entity';
import { User } from './users/user.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Task management API')
    .setDescription(
      'REST API for managing user-owned projects and tasks. Request and response field names use camelCase. Registration requires a valid email, fullName, an E.164 phoneNumber, and a 17-72 character password with uppercase, lowercase, number, and symbol characters. Login returns a 15-minute accessToken and refreshToken. Authenticated API activity extends the session by one hour; the frontend should rotate refreshToken through POST /auth/refresh before accessToken expires while the user remains active. The session expires after one hour without authenticated API activity. POST /auth/logout revokes the session immediately. Project owners are project managers: they assign tasks by user UID and review completed work. Assignees can update their own task status (pending, inProgress, done). Paginated list endpoints return items, total, page, and limit. Errors use a consistent JSON response containing statusCode, message, path, and timestamp; validation errors may return an array of messages.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [User, Project, Task],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
