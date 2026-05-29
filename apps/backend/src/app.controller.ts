import { Controller, Get } from "@nestjs/common";

import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  // 글로벌 JwtAuthGuard 도입 후에도 health 는 인증 없이 접근 가능해야 한다(비파괴).
  @Public()
  @Get("health")
  health() {
    return { status: "ok", service: "pullim-classbot-backend" };
  }
}
