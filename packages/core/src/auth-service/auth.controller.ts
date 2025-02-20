import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenPayloadDto,
} from './dto/auth.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.login(loginDto, req);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.refreshToken(refreshTokenDto, req);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.register(registerDto, req);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: { user: TokenPayloadDto }) {
    await this.authService.revokeAllUserTokens(req.user.sub);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: { user: TokenPayloadDto }) {
    return req.user;
  }
}
