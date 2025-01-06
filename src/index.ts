import logger from "@/logger";
import bodyParser from "body-parser";
import * as childProcess from "child_process";
import crypto from "crypto";
import env from "env-var";
import express, { ErrorRequestHandler } from "express";
import stripAnsi from "strip-ansi";
import { JsonObject } from "type-fest";
import * as util from "util";

const exec = util.promisify(childProcess.exec);

const DEPLOY_SCRIPT_PATH = env.get("DEPLOY_SCRIPT_PATH").required().asString();
const DISCORD_WEBHOOK_URL = env
  .get("DISCORD_WEBHOOK_URL")
  .required()
  .asString();
const WEBHOOK_SECRET = env.get("WEBHOOK_SECRET").required().asString();
const PORT = env.get("PORT").default(3000).asPortNumber();
const TIME_LIMIT = env.get("TIME_LIMIT").default(300).asIntPositive();
const ERROR_LOG_PATTERN = env
  .get("ERROR_LOG_PATTERN")
  .default("error")
  .asRegExp("i");

function verifySignature(signature: string, timestamp: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(timestamp)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (err) {
    logger.warn("verifySignature:", err);
    return false;
  }
}

function checkHeader(header: unknown): header is string {
  return typeof header === "string" && header !== "";
}

async function sendDiscordWebhook(payload: JsonObject, deployLog: string) {
  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(payload));
  formData.append(
    "file",
    new Blob([deployLog], { type: "text/plain" }),
    `deploy_${Date.now()}.log`,
  );
  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    logger.error(await res.text());
  }
}

const app = express();
app.use(bodyParser.json());

app.post("/webhook/:serviceId([a-zA-Z0-9_-]+)", async (req, res) => {
  const { serviceId } = req.params;
  const resJson = (message: string, statusCode = 200) => {
    res.status(statusCode).json({ message });
    return;
  };
  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];

  if (!checkHeader(signature)) {
    return resJson("Missing signature", 400);
  } else if (!checkHeader(timestamp)) {
    return resJson("Missing timestamp", 400);
  }

  // Verify timestamp
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > TIME_LIMIT) {
    return resJson("Timestamp expired", 403);
  }

  // Verify HMAC signature
  if (!verifySignature(signature, timestamp)) {
    return resJson("Invalid signature", 403);
  }

  logger.info(`Webhook received and verified: ${serviceId}`);

  let log = "";
  let isSucceeded = false;
  try {
    resJson("Accepted", 202);
    const { stdout } = await exec(`${DEPLOY_SCRIPT_PATH} ${serviceId}`);
    log = stdout;
    if (!ERROR_LOG_PATTERN.test(log)) {
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
});

app.get("/health", (req, res) => {
  res.json({});
});

app.all("*", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// エラーハンドリングミドルウェア
const errorHandler: ErrorRequestHandler = (err, req, res, _) => {
  logger.error("Unhandled error:", err);

  res.status(500).json({ message: "Internal Server Error" });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
