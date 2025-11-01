import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfService } from '../pdf/pdf.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfService],
  exports: [DocumentsService, PdfService],
})
export class DocumentsModule {}
