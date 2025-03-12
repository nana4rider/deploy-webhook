import env from "@/env";
import logger from "@/logger";
import exec from "@actions/exec";

export default async function executeDeployScript(serviceId: string) {
  logger.info(`Webhook received and verified: ${serviceId}`);

  try {
    const { exitCode } = await exec.getExecOutput(
      env.DEPLOY_SCRIPT_PATH,
      [serviceId],
      { ignoreReturnCode: true, silent: true },
    );

    if (exitCode === 0) {
      logger.info(`Deployment succeeded for ${serviceId}`);
    } else {
      logger.error(`Deployment failed for ${serviceId}`);
    }
  } catch (err) {
    logger.error(`Deployment failed for ${serviceId}`, err);
  }
}
