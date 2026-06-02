import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

const DEFAULT_PORT = 4032;
/** classbot FE dev 오리진 기본값. */
const DEFAULT_CORS_ORIGIN = "http://localhost:3032";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  // classbot FE(:3032)에서의 브라우저 호출 허용. 오리진은 env(CORS_ORIGIN, 콤마 구분)로 재정의.
  const corsOrigins = (process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
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
