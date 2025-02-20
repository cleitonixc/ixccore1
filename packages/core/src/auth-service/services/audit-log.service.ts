import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async log(data: {
    action: string;
    userId?: string;
    email?: string;
    tenantId?: string;
    status: 'success' | 'failure';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }) {
    const log = this.auditLogRepository.create({
      ...data,
      details: data.details ? JSON.stringify(data.details) : undefined,
    });

    await this.auditLogRepository.save(log);
  }

  async getRecentFailedAttempts(
    email: string,
    minutes: number = 15,
  ): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    return this.auditLogRepository.count({
      where: {
        email,
        status: 'failure',
        createdAt: MoreThanOrEqual(cutoff),
      },
    });
  }
}
