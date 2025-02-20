import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  LoginDto,
  RegisterDto,
  TokenPayloadDto,
  RefreshTokenDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { AuditLogService } from './services/audit-log.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogService: AuditLogService,
  ) {}

  private async generateTokens(
    payload: TokenPayloadDto,
    req?: Request,
  ): Promise<AuthResponseDto> {
    const access_token = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias para expirar

    await this.refreshTokenRepository.save({
      token: refreshToken,
      userId: payload.sub,
      expiresAt,
      userAgent: req?.headers['user-agent'],
      ipAddress: req?.ip,
    });

    return {
      access_token,
      refresh_token: refreshToken,
      user: {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles,
        isSuperAdmin: payload.isSuperAdmin,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, req?: Request) {
    try {
      // Verificar tentativas de login recentes
      const recentFailures = await this.auditLogService.getRecentFailedAttempts(
        loginDto.email,
      );
      if (recentFailures >= 5) {
        await this.auditLogService.log({
          action: 'login',
          email: loginDto.email,
          status: 'failure',
          ipAddress: req?.ip,
          userAgent: req?.headers['user-agent'],
          details: { reason: 'Too many failed attempts' },
        });
        throw new ForbiddenException(
          'Too many failed attempts. Please try again later.',
        );
      }

      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        await this.auditLogService.log({
          action: 'login',
          email: loginDto.email,
          status: 'failure',
          ipAddress: req?.ip,
          userAgent: req?.headers['user-agent'],
          details: { reason: 'Invalid credentials' },
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        await this.auditLogService.log({
          action: 'login',
          email: loginDto.email,
          userId: user.id,
          status: 'failure',
          ipAddress: req?.ip,
          userAgent: req?.headers['user-agent'],
          details: { reason: 'Account inactive' },
        });
        throw new ForbiddenException('User account is inactive');
      }

      if (
        !user.isSuperAdmin &&
        loginDto.tenantId &&
        user.tenantId !== loginDto.tenantId
      ) {
        await this.auditLogService.log({
          action: 'login',
          email: loginDto.email,
          userId: user.id,
          status: 'failure',
          ipAddress: req?.ip,
          userAgent: req?.headers['user-agent'],
          details: {
            reason: 'Tenant access denied',
            attemptedTenant: loginDto.tenantId,
          },
        });
        throw new ForbiddenException('Access to this tenant is not allowed');
      }

      const payload: TokenPayloadDto = {
        sub: user.id,
        email: user.email,
        tenantId: loginDto.tenantId || user.tenantId,
        roles: user.roles,
        isSuperAdmin: user.isSuperAdmin,
      };

      const tokens = await this.generateTokens(payload, req);

      await this.auditLogService.log({
        action: 'login',
        email: user.email,
        userId: user.id,
        tenantId: payload.tenantId,
        status: 'success',
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      });

      return tokens;
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, req?: Request) {
    const refreshTokenData = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenDto.refreshToken },
      relations: ['user'],
    });

    if (
      !refreshTokenData ||
      refreshTokenData.isRevoked ||
      refreshTokenData.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = refreshTokenData.user;
    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    // Revogar o token atual
    await this.refreshTokenRepository.update(refreshTokenData.id, {
      isRevoked: true,
      revokedAt: new Date(),
    });

    const payload: TokenPayloadDto = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    };

    return this.generateTokens(payload, req);
  }

  async register(registerDto: RegisterDto, req?: Request) {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        await this.auditLogService.log({
          action: 'register',
          email: registerDto.email,
          status: 'failure',
          ipAddress: req?.ip,
          userAgent: req?.headers['user-agent'],
          details: { reason: 'Email already registered' },
        });
        throw new ForbiddenException('Email already registered');
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const user = this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
      });

      await this.userRepository.save(user);

      await this.auditLogService.log({
        action: 'register',
        email: user.email,
        userId: user.id,
        tenantId: user.tenantId,
        status: 'success',
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      });

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async revokeAllUserTokens(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }
}
