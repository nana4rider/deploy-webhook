import env from "@/env";
import logger from "@/logger";
import * as child_process from "child_process";
import { promisify } from "util";

const exec = promisify(child_process.exec);

export default async function executeDeployScript(serviceId: string) {
  logger.info(`Webhook received and verified: ${serviceId}`);

  try {
    await exec(`${env.DEPLOY_SCRIPT_PATH} ${serviceId}`);
    logger.info(`Deployment succeeded for ${serviceId}`);
  } catch (err) {
    logger.error(`Deployment failed for ${serviceId}`, err);
  }
}
