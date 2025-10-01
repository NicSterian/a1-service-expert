import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          token,
          expiresAt,
        },
      });

      return createdUser;
    });

    await this.emailService.sendVerificationEmail(user.email, token);
    this.logVerificationToken(user.email, token);

    return {
      user: this.presentUser(user),
      verificationToken: this.shouldExposeTokens() ? token : undefined,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: this.presentUser(user),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!tokenRecord) {
      throw new NotFoundException('Verification token not found');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      throw new NotFoundException('Verification token expired');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerified: true },
      });

      await tx.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      return updatedUser;
    });

    return {
      user: this.presentUser(user),
    };
  }

  private presentUser(user: User): AuthUser {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private shouldExposeTokens(): boolean {
    const env = this.configService.get<string>('NODE_ENV');
    const flag = this.configService.get<string>('EXPOSE_VERIFICATION_TOKEN');
    const isProduction = env?.toLowerCase() === 'production';

    if (isProduction) {
      return flag === 'true';
    }

    if (flag === 'false') {
      return false;
    }

    return true;
  }

  private logVerificationToken(email: string, token: string) {
    if (this.shouldExposeTokens()) {
      this.logger.log(`Verification token for ${email}: ${token}`);
    }
  }
}