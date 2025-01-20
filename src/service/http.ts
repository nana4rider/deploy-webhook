import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import { verifySignature } from "@/util/cryptoUtil";
import fastify from "fastify";

export default async function initializeHttpServer() {
  const server = fastify();

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
        params: {
          type: "object",
          required: ["serviceId"],
          properties: {
            serviceId: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
          },
        },
        headers: {
          type: "object",
          required: ["x-signature", "x-timestamp"],
          properties: {
            "x-signature": { type: "string" },
            "x-timestamp": { type: "string", pattern: "^\\d+$" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { serviceId } = request.params;
      const signature = request.headers["x-signature"];
      const timestamp = request.headers["x-timestamp"];

      // Verify timestamp
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp, 10)) > env.TIME_LIMIT) {
        return reply.code(403).send({ message: "Timestamp expired" });
      }

      // Verify HMAC signature
      if (!verifySignature(signature, timestamp)) {
        return reply.code(403).send({ message: "Invalid signature" });
      }

      logger.info(`Webhook received and verified: ${serviceId}`);

      executeDeployScript(serviceId).catch((err) => {
        logger.error("callDeployScript", err);
      });

      reply.code(202).send({ message: "Accepted" });
    },
  );

  server.get("/health", () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  }));

  await server.listen({ host: "0.0.0.0", port: env.PORT });
  logger.info(`[HTTP] listen port: ${env.PORT}`);

  return server;
}
