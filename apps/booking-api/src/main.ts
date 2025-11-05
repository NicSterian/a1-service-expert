import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

function getCorsOrigins(): (string | RegExp)[] {
  const env = process.env.CORS_ORIGINS;
  if (!env) {
    return ['http://localhost:5173'];
  }

  return env.split(',').map((origin) => origin.trim()).filter(Boolean);
}

type FormattedValidationError = {
  field: string;
  errors: string[];
};

const formatValidationErrors = (errors: any[], parentPath = ''): FormattedValidationError[] => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  return errors.flatMap((error) => {
    const property: string | undefined = error?.property;
    const path = property ? (parentPath ? `${parentPath}.${property}` : property) : parentPath;
    const constraints = error?.constraints ? Object.values(error.constraints) : [];
    const children = formatValidationErrors(error?.children ?? [], path);
    const current: FormattedValidationError[] = constraints.length ? [{ field: path, errors: constraints.map(String) }] : [];
    return [...current, ...children];
  });
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

 // main.ts
app.enableCors({
  origin: [
    ...getCorsOrigins(),         // from your CORS_ORIGINS env
    /\.github\.dev$/,            // ✅ GitHub Codespaces web URL
    /\.githubpreview\.dev$/,     // ✅ Codespaces preview URL
  ],
  credentials: true,
});


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false },
      exceptionFactory: (errors) => {
        const formatted = formatValidationErrors(errors);
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatted,
        });
      },
    }),
  );

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  
  console.log('DVLA key present?', !!process.env.DVLA_API_KEY);

}


bootstrap();
