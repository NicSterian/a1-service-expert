import { Controller, Get, NotFoundException, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import type { User } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get(':id/download')
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: User,
    @Res() res: Response,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const isOwner = document.booking?.userId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

    if (!isOwner && !isAdmin) {
      throw new NotFoundException('Document not found');
    }

    const filePath = this.documentsService.getDocumentFilePath(document);

    if (!filePath) {
      throw new NotFoundException('Document file missing');
    }

    res.download(filePath, `${document.number}.pdf`);
  }
}


