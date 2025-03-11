import env from "@/env";
import executeDeployScript from "@/service/deploy";
import initializeHttpServer, { route } from "@/service/http";
import crypto from "crypto";
import fastify, { FastifyInstance } from "fastify";

jest.mock("@/service/deploy", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("initializeHttpServer", () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = await initializeHttpServer();
  });

  afterEach(async () => {
    await server.close();
  });

  test("route()が正常終了すること", () => {
    const server = fastify();
    const actual = () => route(server);

    expect(actual).not.toThrow();
  });

  test("/health エンドポイントでヘルスステータスが返されること", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      uptime: expect.any(Number) as number,
      timestamp: expect.any(Number) as number,
    });
  });

  describe("/webhook/:serviceId", () => {
    const generateSignature = (epochSeconds: number) =>
      crypto
        .createHmac("sha256", env.WEBHOOK_SECRET)
        .update(epochSeconds.toString())
        .digest("hex");

    test("サービスIDが条件に一致していないと400を返すこと", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/webhook/%%%",
      });

      expect(response.statusCode).toBe(400);
    });

    test("ヘッダが不足していると400を返すこと", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/webhook/test",
        headers: {
          "x-timestamp": "12345",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test("タイムスタンプが有効期限切れの場合403を返すこと", async () => {
      const timestamp = 0;

      const response = await server.inject({
        method: "POST",
        url: "/webhook/test",
        headers: {
          "x-signature": generateSignature(timestamp),
          "x-timestamp": timestamp.toString(),
        },
      });

      expect(JSON.parse(response.body)).toEqual({
        message: "Timestamp expired",
      });
      expect(response.statusCode).toBe(403);
    });

    test("署名が不正な場合403を返すこと", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/webhook/test",
        headers: {
          "x-signature": "invalid",
          "x-timestamp": Math.floor(Date.now() / 1000).toString(),
        },
      });

      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid signature",
      });
      expect(response.statusCode).toBe(403);
    });

    test("署名が正しい場合、executeDeployScriptを呼び出して202を返すこと", async () => {
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await server.inject({
        method: "POST",
        url: "/webhook/test",
        headers: {
          "x-signature": generateSignature(timestamp),
          "x-timestamp": timestamp.toString(),
        },
      });

      expect(executeDeployScript).toHaveBeenCalled();
      expect(JSON.parse(response.body)).toEqual({
        message: "Accepted",
      });
      expect(response.statusCode).toBe(202);
    });
  });
});
