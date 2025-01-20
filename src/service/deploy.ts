import env from "@/env";
import logger from "@/logger";
import sendDiscordWebhook from "@/service/webhook";
import exec from "@actions/exec";
import stripAnsi from "strip-ansi";

export default async function executeDeployScript(serviceId: string) {
  const { stdout, exitCode } = await exec.getExecOutput(
    env.DEPLOY_SCRIPT_PATH,
    [serviceId],
    { ignoreReturnCode: true },
  );
  const log = stripAnsi(stdout);

  if (exitCode === 0) {
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
      log,
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
      log,
    );
  }
}
