import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { SignupRateLimitGuard } from '../rate-limit/signup-rate-limit.guard';
import { RecaptchaGuard } from '../security/recaptcha.guard';
import { RecaptchaProtected } from '../security/recaptcha.decorator';
import { AuthUser } from './auth-user.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginResponse, MeResponse, PublicUser, RegisterResponse, VerifyResponse } from './auth.responses';

const toPublicUser = (user: { id: number; email: string; role: string; emailVerified: boolean }): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(SignupRateLimitGuard, RecaptchaGuard)
  @RecaptchaProtected('captchaToken')
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    const result = await this.authService.register(dto);
    return {
      user: toPublicUser(result.user),
      verificationToken: result.verificationToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    const result = await this.authService.login(dto);
    return {
      user: toPublicUser(result.user),
      token: result.token,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@AuthUser() user: User): MeResponse {
    return {
      user: toPublicUser(user),
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyResponse> {
    await this.authService.verifyEmail(dto);
    return { ok: true };
  }
}
