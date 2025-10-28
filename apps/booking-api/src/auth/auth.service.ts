import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { PublicUser } from './auth.responses';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export type AuthRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, context: AuthRequestContext) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: true,
        title: dto.title.trim().toUpperCase(),
        firstName: sanitiseString(dto.firstName),
        lastName: sanitiseString(dto.lastName),
        companyName: sanitiseString(dto.companyName),
        mobileNumber: sanitisePhone(dto.mobileNumber),
        landlineNumber: sanitisePhone(dto.landlineNumber),
        addressLine1: sanitiseString(dto.addressLine1),
        addressLine2: sanitiseString(dto.addressLine2),
        addressLine3: sanitiseString(dto.addressLine3),
        city: sanitiseString(dto.city),
        county: sanitiseString(dto.county),
        postcode: normalisePostcode(dto.postcode),
        marketingOptIn: dto.marketingOptIn ?? false,
        notes: sanitiseString(dto.notes),
        registrationIp: context.ipAddress ?? null,
        profileUpdatedAt: now,
      },
    });

    this.logger.log(`New user registered: ${user.email}`);

    return {
      user: this.presentUser(user),
    };
  }

  async login(dto: LoginDto, context: AuthRequestContext) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const loginAt = new Date();
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: loginAt,
        },
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      }),
    ]);

    const payload = { sub: updatedUser.id, role: updatedUser.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: this.presentUser(updatedUser),
    };
  }

  presentUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      title: user.title ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      companyName: user.companyName ?? null,
      mobileNumber: user.mobileNumber ?? null,
      landlineNumber: user.landlineNumber ?? null,
      addressLine1: user.addressLine1 ?? null,
      addressLine2: user.addressLine2 ?? null,
      addressLine3: user.addressLine3 ?? null,
      city: user.city ?? null,
      county: user.county ?? null,
      postcode: user.postcode ?? null,
      marketingOptIn: user.marketingOptIn ?? false,
      notes: user.notes ?? null,
      profileUpdatedAt: user.profileUpdatedAt ? user.profileUpdatedAt.toISOString() : null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

}
