/*
 Simple SMTP verification/smoke test using current env.
 Usage:
   pnpm --filter booking-api smtp:verify
   pnpm --filter booking-api smtp:test --to you@example.com
*/
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
// Load env from both repo root and app env (first wins)
const appEnv = join(process.cwd(), 'apps', 'booking-api', '.env');
if (existsSync(appEnv)) loadEnv({ path: appEnv });
loadEnv();
import * as nodemailer from 'nodemailer';

function readEnv(key: string, fallback?: string) {
  const v = process.env[key];
  return v && v.trim().length ? v.trim() : fallback;
}

async function main() {
  const mode = process.argv[2] || 'verify';

  const host = readEnv('SMTP_HOST');
  const port = Number(readEnv('SMTP_PORT', '0'));
  const secure = ['true', '1'].includes(String(readEnv('SMTP_SECURE', 'false')).toLowerCase());
  const user = readEnv('SMTP_USER');
  const pass = readEnv('SMTP_PASS');
  const fromName = readEnv('MAIL_FROM_NAME', 'A1 Service Expert');
  const fromEmail = readEnv('MAIL_FROM_EMAIL');

  if (!host || !port || !user || !pass || !fromEmail) {
    console.error('SMTP configuration incomplete. Please set SMTP_* and MAIL_FROM_* vars in apps/booking-api/.env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

  console.log('Verifying SMTP connection to %s:%d (secure=%s) as %s', host, port, String(secure), user);
  try {
    await transporter.verify();
    console.log('SMTP verify: OK');
  } catch (err) {
    console.error('SMTP verify failed:', (err as Error).message);
    process.exit(2);
  }

  if (mode === 'send' || mode === 'test') {
    const toArg = process.argv.find((a) => a.startsWith('--to='));
    const to = toArg ? toArg.slice('--to='.length) : readEnv('TO');
    if (!to) {
      console.error('Please supply a recipient via --to=you@example.com or TO env var.');
      process.exit(3);
    }
    try {
      await transporter.sendMail({
        from: `"${fromName.replace(/"/g, "'")}" <${fromEmail}>`,
        to,
        subject: 'SMTP test from A1 Service Expert',
        text: 'This is a test email to verify SMTP configuration.',
      });
      console.log('Test email sent to %s', to);
    } catch (err) {
      console.error('Send failed:', (err as Error).message);
      process.exit(4);
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(10);
});
