import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '512kb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidUnknownValues: false
    })
  );

  const documentConfig = new DocumentBuilder()
    .setTitle('User Tracking Collector API')
    .setDescription('Event ingestion API for tracking user journeys, attribution, and payment callbacks.')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addSecurityRequirements('api-key')
    .build();
  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
