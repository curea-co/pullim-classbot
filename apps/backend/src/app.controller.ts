import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  /** 이 앱의 유일한 라우트. 전역 가드가 없으므로 인증 없이 응답한다. */
  @Get("health")
  health() {
    return { status: "ok", service: "pullim-classbot-backend" };
  }
}
