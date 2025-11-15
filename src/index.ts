import { AppModule } from './modules/app';
import { setupSwagger } from './utils';
import { ConfigService } from '@nestjs/config';
import { Reflector, NestFactory } from '@nestjs/core';
import { HttpExceptionFilter, QueryFailedFilter } from './filters';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import Config from './config';

import * as helmet from 'helmet';
import * as morgan from 'morgan';
import * as compression from 'compression';
import * as RateLimit from 'express-rate-limit';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(),
        { cors: false },
    );

    setupSwagger(app);
    const configService = app.get(ConfigService);
    await app.listen(Config.apiPort);
}

void bootstrap();