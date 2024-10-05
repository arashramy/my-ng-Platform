import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import path, { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import moment from 'moment';
import { DataSource } from 'typeorm';
import { UsersService } from './auth/service/users.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { BackupService } from './backup/backup.service';

const swig = require('swig');
process.setMaxListeners(0);

async function bootstrap() {
  let httpsOptions: any = undefined;
  if (process.env.IS_HTTPS === 'true') {
    httpsOptions = {
      cert: readFileSync(path.join(__dirname, '..', 'ssl.cert')),
      key: readFileSync(path.join(__dirname, '..', 'private.cert'))
    };
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['verbose'],
    ...(typeof httpsOptions === typeof undefined ? {} : { httpsOptions })
  });

  await app
    .get(DataSource)
    ?.query(
      `ALTER DATABASE ${process.env.DATASOURCE_DATABASE} SET timezone TO 'UTC'`
    );
  await app.get(UsersService)?.createDefaultUser();
  app.enableCors();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gymsoft API')
    .setDescription('Documentation for api gymsoft')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('document', app, document);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb' }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setBaseViewsDir(join(__dirname, '..', 'client'));
  app.engine('html', swig.renderFile);
  app.set('view engine', 'html');
  app.useStaticAssets(join(__dirname, '..', 'client'), { index: false });
  app.get(BackupService).automaticlyRegisterBackupCron();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );
  app.enableShutdownHooks();

  await app.listen(process.env.PORT, () => {
    console.log(process.env.PORT, moment());
  });
}

bootstrap().then();
