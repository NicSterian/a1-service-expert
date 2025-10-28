import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  getProfile(@AuthUser() user: User) {
    return {
      user: this.accountService.toPublicUser(user),
    };
  }

  @Patch('profile')
  async updateProfile(@AuthUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.accountService.updateProfile(user, dto);
    return { user: updated };
  }

  @Patch('change-password')
  async changePassword(@AuthUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.accountService.changePassword(user, dto);
    return { ok: true };
  }
}
