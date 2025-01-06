import logger from "@/logger";
import bodyParser from "body-parser";
import * as childProcess from "child_process";
import crypto from "crypto";
import env from "env-var";
import express from "express";
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

function verifySignature(signature: string, timestamp: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(timestamp)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

function checkHeader(header: unknown): header is string {
  return typeof header === "string" && header !== "";
}

async function sendDiscordWebhook(log: string, status: string) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([log], { type: "text/plain" }),
    "deploy.log",
  );
  formData.append(
    "payload_json",
    JSON.stringify({
      content: `Deployment ${status}`,
    }),
  );
  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });
}

const app = express();
app.use(bodyParser.json());

app.post("/webhook/:serviceId([a-zA-Z0-9_-]+)", async (req, res, next) => {
  const { serviceId } = req.params;
  const resJson = (message: string, statusCode = 200) => {
    res.status(statusCode).json({ message });
    next();
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

  try {
    resJson("Accepted", 202);
    const { stdout: log } = await exec(`${DEPLOY_SCRIPT_PATH} ${serviceId}`);
    logger.info(`Deployment succeeded for ${serviceId}`);
    await sendDiscordWebhook(log, "succeeded");
  } catch (err) {
    const log = err instanceof Error ? err.message : String(err);
    logger.error(`Deployment failed for ${serviceId}`);
    await sendDiscordWebhook(log, "failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
