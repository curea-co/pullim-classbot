import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

const DEFAULT_PORT = 4032;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  // 본체 pullim 정렬: DTO 화이트리스트 + 자동 변환.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  console.log(`[pullim-classbot/backend] listening on :${port}`);
}

void bootstrap();
