import env from "@/env";
import logger from "@/logger";
import exec from "@actions/exec";
import { AttachmentPayload, WebhookClient } from "discord.js";
import stripAnsi from "strip-ansi";

const COLOR_SUCCESS = 0x28a746;
const COLOR_FAILURE = 0xcb2432;

export default async function executeDeployScript(serviceId: string) {
  logger.info(`Webhook received and verified: ${serviceId}`);

  const webhook = new WebhookClient({ url: env.DISCORD_WEBHOOK_URL });
  const description = `Service ID: ${serviceId}`;
  const logName = `deploy_${Date.now()}.log`;

  try {
    const { stdout, exitCode } = await exec.getExecOutput(
      env.DEPLOY_SCRIPT_PATH,
      [serviceId],
      { ignoreReturnCode: true },
    );

    const files: AttachmentPayload[] = [
      {
        attachment: Buffer.from(stripAnsi(stdout), "utf-8"),
        name: logName,
      },
    ];

    if (exitCode === 0) {
      logger.info(`Deployment succeeded for ${serviceId}`);

      await webhook.send({
        embeds: [
          {
            title: "Success: Deploy",
            description,
            color: COLOR_SUCCESS,
          },
        ],
        files,
      });
    } else {
      logger.error(`Deployment failed for ${serviceId}`);

      await webhook.send({
        content: env.DISCORD_MENTION,
        embeds: [
          {
            title: "Failure: Deploy",
            description,
            color: COLOR_FAILURE,
          },
        ],
        files,
      });
    }
  } catch (err) {
    logger.error(`Deployment failed for ${serviceId}`, err);

    const message = (err as Error).stack!;
    const files: AttachmentPayload[] = [
      {
        attachment: Buffer.from(message, "utf-8"),
        name: logName,
      },
    ];

    try {
      await webhook.send({
        content: env.DISCORD_MENTION,
        embeds: [
          {
            title: "Failure: Execute Deploy Script",
            description,
            color: COLOR_FAILURE,
          },
        ],
        files,
      });
    } catch (err) {
      logger.error("webhook error", err);
    }
  }
}
