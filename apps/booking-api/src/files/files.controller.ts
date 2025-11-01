import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join, resolve } from 'path';
import { promises as fs } from 'fs';

@Controller('files')
export class FilesController {
  @Get('invoices/:filename')
  async getInvoice(@Param('filename') filename: string, @Res() res: Response) {
    const candidates = [
      // Preferred invoices dir under current working directory
      join(process.cwd(), 'storage', 'invoices', filename),
      // Some environments use a generic 'documents' dir
      join(process.cwd(), 'storage', 'documents', filename),
      // Fallbacks to repo root when cwd is apps/booking-api
      resolve(process.cwd(), '..', '..', 'storage', 'invoices', filename),
      resolve(process.cwd(), '..', '..', 'storage', 'documents', filename),
    ];
    for (const p of candidates) {
      try {
        await fs.stat(p);
        return res.sendFile(p);
      } catch {}
    }
    // Not found
    return res.status(404).json({ statusCode: 404, message: `ENOENT: not found ${candidates[0]}` });
  }
}
