import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggerService } from './infrastructure/logging/logger.service';
import { LoggingInterceptor } from './infrastructure/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const logger = new LoggerService(configService);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Configurações globais
  app.setGlobalPrefix('api');
  app.enableCors();

  const port = configService.get('PORT') || 7001;
  // Iniciar servidor
  await app.listen(port);
  logger.log(`Core module running on: http://localhost:${port}/api`);
}
bootstrap();
