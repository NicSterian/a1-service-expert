import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { SignupRateLimitGuard } from '../rate-limit/signup-rate-limit.guard';
import { TurnstileGuard } from '../security/turnstile.guard';
import { TurnstileProtected } from '../security/turnstile.decorator';
import { AuthUser } from './auth-user.decorator';
import { AuthService, AuthRequestContext } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginResponse, MeResponse, RegisterResponse } from './auth.responses';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(SignupRateLimitGuard, TurnstileGuard)
  @TurnstileProtected('captchaToken')
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<RegisterResponse> {
    const context = this.extractRequestContext(req);
    const result = await this.authService.register(dto, context);
    return {
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponse> {
    const context = this.extractRequestContext(req);
    const result = await this.authService.login(dto, context);
    return {
      user: result.user,
      token: result.token,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@AuthUser() user: User): MeResponse {
    return {
      user: this.authService.presentUser(user),
    };
  }

  private extractRequestContext(req: Request): AuthRequestContext {
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ipAddress = forwarded || req.socket.remoteAddress || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
    return {
      ipAddress,
      userAgent,
    };
  }
}
