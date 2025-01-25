import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import { verifySignature } from "@/util/cryptoUtil";
import fastify, { FastifyInstance } from "fastify";

export default async function initializeHttpServer() {
  const server = fastify();

  route(server);

  await server.listen({ host: "0.0.0.0", port: env.PORT });
  logger.info(`[HTTP] listen port: ${env.PORT}`);

  return server;
}

export function route(server: FastifyInstance) {
  server.get("/health", { schema: { hide: true } }, () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  }));

  server.post<{
    Params: {
      serviceId: string;
    };
    Headers: {
      "x-signature": string;
      "x-timestamp": string;
    };
  }>(
    "/webhook/:serviceId",
    {
      schema: {
        description:
          "指定されたサービスIDを引数に指定して、デプロイスクリプトを実行します",
        params: {
          type: "object",
          required: ["serviceId"],
          properties: {
            serviceId: {
              type: "string",
              pattern: "^[a-zA-Z0-9_-]+$",
              description: "デプロイするサービスのID",
            },
          },
        },
        headers: {
          type: "object",
          required: ["x-signature", "x-timestamp"],
          properties: {
            "x-signature": {
              type: "string",
              description:
                "シークレットを使用して生成されたリクエストのHMAC SHA-256署名",
            },
            "x-timestamp": {
              type: "string",
              pattern: "^\\d+$",
              description: "リクエストのタイムスタンプ(エポック秒)",
            },
          },
        },
        response: {
          202: {
            type: "object",
            description:
              "デプロイが受け付けられ、バックグラウンドで処理を開始した",
            properties: {
              message: {
                type: "string",
                example: "Accepted",
              },
            },
          },
          403: {
            type: "object",
            description: "ヘッダーが不足している、または無効",
            properties: {
              message: {
                type: "string",
                example: "Invalid signature",
              },
            },
          },
        },
      },
      preHandler: (request, reply, done) => {
        const signature = request.headers["x-signature"];
        const timestamp = parseInt(request.headers["x-timestamp"], 10);
        // タイムスタンプの検証
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > env.TIME_LIMIT) {
          reply.code(403).send({ message: "Timestamp expired" });
          return;
        }
        // HMAC署名の検証
        if (!verifySignature(signature, timestamp)) {
          reply.code(403).send({ message: "Invalid signature" });
          return;
        }
        done();
      },
    },
    async (request, reply) => {
      void executeDeployScript(request.params.serviceId);
      reply.code(202).send({ message: "Accepted" });
    },
  );
}
