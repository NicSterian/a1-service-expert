import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

type InvoiceTemplateData = Record<string, unknown>;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private compiled: { [name: string]: Handlebars.TemplateDelegate } = {};
  private cssCache: { [name: string]: string } = {};

  constructor() {
    this.registerHelpers();
  }

  async renderInvoiceToFile(data: InvoiceTemplateData, outputPath: string) {
    const html = await this.render('invoice', data);
    await this.renderHtmlToPdf(html, outputPath);
  }

  private async render(name: 'invoice', data: InvoiceTemplateData): Promise<string> {
    const template = await this.getTemplate(name);
    const css = await this.getCss(name);
    const body = template(data);
    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${css}</style>
        </head>
        <body>${body}</body>
      </html>`;
  }

  private async getTemplate(name: string): Promise<Handlebars.TemplateDelegate> {
    if (this.compiled[name]) return this.compiled[name];
    const file = await this.resolveTemplatePath(name, 'hbs');
    const source = await fs.readFile(file, 'utf8');
    const tpl = Handlebars.compile(source, { noEscape: true });
    this.compiled[name] = tpl;
    return tpl;
  }

  private async getCss(name: string): Promise<string> {
    if (this.cssCache[name]) return this.cssCache[name];
    const file = await this.resolveTemplatePath(name, 'css');
    const css = await fs.readFile(file, 'utf8');
    this.cssCache[name] = css;
    return css;
  }

  private async renderHtmlToPdf(html: string, outputPath: string) {
    let browser: Browser | null = null;
    try {
      const execPath = await this.resolveExecutablePath();
      // Removed noisy log: this.logger.log(`Puppeteer executable: ${execPath || 'bundled/default'}`);
      browser = await puppeteer.launch({
        headless: true,
        executablePath: execPath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--allow-file-access-from-files',
          '--disable-web-security',
          '--font-render-hinting=medium',
          '--disable-gpu',
        ],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Give extra time for images to render
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.emulateMediaType('print');
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
      });
      // Verify the file exists before returning
      try {
        await fs.stat(outputPath);
        // Removed noisy log: this.logger.log(`PDF generated at: ${outputPath}`);
      } catch (e) {
        const msg = (e as Error)?.message || String(e);
        this.logger.error(`PDF file missing after render: ${outputPath} -> ${msg}`);
        throw e;
      }
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Puppeteer render failed: ${e?.message}`);
      throw err;
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }

  private async resolveTemplatePath(name: string, ext: 'hbs' | 'css'): Promise<string> {
    const filename = `${name}.${ext}`;
    const cwd = process.cwd();
    const candidates = [
      // when cwd is repo root
      join(cwd, 'apps', 'booking-api', 'src', 'pdf', 'templates', filename),
      // when cwd is apps/booking-api
      join(cwd, 'src', 'pdf', 'templates', filename),
      // when running from dist
      join(__dirname, 'templates', filename),
      join(__dirname, '..', 'templates', filename),
    ];

    for (const p of candidates) {
      if (await this.pathExists(p)) return p;
    }
    // last resort (original path) to surface meaningful error
    return candidates[0];
  }

  private async resolveExecutablePath(): Promise<string | undefined> {
    // 1) Allow override via env
    const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    if (envPath) return envPath;
    // 2) Puppeteer-managed browser
    try {
      const managed = (puppeteer as unknown as { executablePath?: () => string | undefined }).executablePath?.();
      if (managed && (await this.pathExists(managed))) return managed;
    } catch {}
    // 3) Common Windows Chrome locations
    const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const pf = process.env['PROGRAMFILES'] || 'C:\\Program Files';
    const candidates = [
      join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['LOCALAPPDATA'] ? join(process.env['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe') : undefined,
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      if (await this.pathExists(c)) return c;
    }
    // 4) Fallback to default (let Puppeteer decide)
    return undefined;
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private registerHelpers() {
    Handlebars.registerHelper('money', (pence: unknown) => {
      const n = Number((pence as number | string | null | undefined) ?? 0);
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n / 100);
    });
    Handlebars.registerHelper('date', (iso: unknown) => {
      try {
        if (!iso) return '';
        const d = typeof iso === 'string' ? new Date(iso) : (iso as Date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return String(iso ?? '');
      }
    });
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    Handlebars.registerHelper('and', (a: unknown, b: unknown) => Boolean(a && b));
    Handlebars.registerHelper('not', (a: unknown) => !a);
  }
}

