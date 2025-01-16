import env from "@/env";
import logger from "@/logger";
import { verifySignature } from "@/util/cryptoUtil";
import * as childProcess from "child_process";
import fastify from "fastify";
import stripAnsi from "strip-ansi";
import { JsonObject } from "type-fest";
import * as util from "util";

const exec = util.promisify(childProcess.exec);
const errorLogPattern = new RegExp(
  env.ERROR_LOG_PATTERN,
  env.ERROR_LOG_PATTERN_FLAG,
);

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

      let log = "";
      let isSucceeded = false;
      try {
        reply.code(202).send({ message: "Accepted" });

        const { stdout } = await exec(`${env.DEPLOY_SCRIPT_PATH} ${serviceId}`);
        log = stdout;
        if (!errorLogPattern.test(log)) {
          isSucceeded = true;
        }
      } catch (err) {
        const { stdout } = err as { stdout: string; stderr: string };
        log = stdout;
      }

      if (isSucceeded) {
        logger.info(`Deployment succeeded for ${serviceId}`);
        await sendDiscordWebhook(
          {
            embeds: [
              {
                title: "Success: Deploy",
                description: `Service ID: ${serviceId}`,
                color: 0x00ff00,
              },
            ],
          },
          stripAnsi(log),
        );
      } else {
        logger.error(`Deployment failed for ${serviceId}`);
        await sendDiscordWebhook(
          {
            content: "@everyone",
            embeds: [
              {
                title: "Failure: Deploy",
                description: `Service ID: ${serviceId}`,
                color: 0xff0000,
              },
            ],
          },
          stripAnsi(log),
        );
      }
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

async function sendDiscordWebhook(payload: JsonObject, deployLog: string) {
  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(payload));
  formData.append(
    "file",
    new Blob([deployLog], { type: "text/plain" }),
    `deploy_${Date.now()}.log`,
  );
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    logger.error(await res.text());
  }
}
