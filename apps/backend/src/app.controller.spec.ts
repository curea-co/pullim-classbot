import { Test } from "@nestjs/testing";

import { AppController } from "./app.controller";

describe("AppController", () => {
  it("health 는 ok 와 서비스 이름을 돌려준다", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    expect(moduleRef.get(AppController).health()).toEqual({
      status: "ok",
      service: "pullim-classbot-backend",
    });
  });
});
