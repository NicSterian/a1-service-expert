import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import type { PublicUser } from '../auth/auth.responses';
import { PrismaService } from '../prisma/prisma.service';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  toPublicUser(user: User): PublicUser {
    return this.authService.presentUser(user);
  }

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<PublicUser> {
    const now = new Date();

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
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
        profileUpdatedAt: now,
      },
    });

    return this.toPublicUser(updated);
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    const passwordMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });
  }
}
