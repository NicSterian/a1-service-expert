import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationRecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.notificationRecipient.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(email: string) {
    try {
      return await this.prisma.notificationRecipient.create({
        data: { email: email.trim().toLowerCase() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Recipient already exists');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.notificationRecipient.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Recipient not found');
      }
      throw error;
    }
  }
}
