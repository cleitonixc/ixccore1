import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;

  constructor(private configService: ConfigService) {
    this.logger = createLogger({
      level: configService.get('LOG_LEVEL', 'info'),
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.metadata(),
        format.json(),
      ),
      defaultMeta: {
        service: 'ixccore',
        environment: configService.get('NODE_ENV', 'development'),
        tenant: configService.get('TENANT_ID', 'default'),
      },
      transports: [
        // Console transport
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, metadata }) => {
              return `[${timestamp}] ${level}: ${message} ${JSON.stringify(metadata)}`;
            }),
          ),
        }),
        // File transport for errors
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // File transport for all logs
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Métodos auxiliares para logging estruturado
  logRequest(req: any, context: string) {
    this.logger.info('HTTP Request', {
      context,
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: req.body,
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.tenant?.id,
    });
  }

  logResponse(res: any, context: string, duration: number) {
    this.logger.info('HTTP Response', {
      context,
      statusCode: res.statusCode,
      duration,
    });
  }

  logError(error: Error, context: string, request?: any) {
    this.logger.error('Error occurred', {
      context,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      request: request
        ? {
            method: request.method,
            url: request.url,
            headers: request.headers,
            query: request.query,
            params: request.params,
            body: request.body,
          }
        : undefined,
    });
  }
}
