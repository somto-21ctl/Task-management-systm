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
      'REST API for managing user-owned projects and tasks. Authenticate with a bearer token from the login endpoint, then use the Authorize button to access protected operations.',
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
