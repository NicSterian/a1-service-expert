import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
