import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateNotificationRecipientDto } from '../email/dto/create-recipient.dto';
import { NotificationRecipientsService } from '../email/notification-recipients.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/notification-recipients')
export class AdminNotificationRecipientsController {
  constructor(private readonly recipientsService: NotificationRecipientsService) {}

  @Get()
  list() {
    return this.recipientsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateNotificationRecipientDto) {
    return this.recipientsService.create(dto.email);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recipientsService.remove(id);
  }
}
