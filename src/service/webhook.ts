import env from "@/env";
import logger from "@/logger";
import { JsonObject } from "type-fest";

export default async function sendDiscordWebhook(
  payload: JsonObject,
  deployLog?: string,
) {
  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(payload));
  if (deployLog) {
    formData.append(
      "file",
      new Blob([deployLog], { type: "text/plain" }),
      `deploy_${Date.now()}.log`,
    );
  }
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    logger.error(await res.text());
  }
}
