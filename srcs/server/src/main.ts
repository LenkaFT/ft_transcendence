import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {bodyParser:true})

  app.use(cookieParser())


  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
        allowedHeaders: [
      "Accept",
      "Origin",
      "X-Api-Key",
      "Content-Type",
      "Authorization",
      "Acces-Control-Request-Methods",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Headers",
      "X-Requested-With",
    ]
  })
  app.useGlobalPipes(new ValidationPipe());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  await app.listen(process.env.PORT);
}
bootstrap();