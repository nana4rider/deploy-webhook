import env from "@/env";
import logger from "@/logger";
import * as child_process from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(child_process.execFile);
let deployQueue = Promise.resolve();

async function runDeployScript(serviceId: string) {
  logger.info(`Deployment started for ${serviceId}`);

  try {
    await execFileAsync(env.DEPLOY_SCRIPT_PATH, [serviceId]);
    logger.info(`Deployment succeeded for ${serviceId}`);
  } catch (err) {
    logger.error(`Deployment failed for ${serviceId}`, err);
  }
}

export default function executeDeployScript(serviceId: string) {
  logger.info(`Deployment queued for ${serviceId}`);

  const deployment = deployQueue.then(() => runDeployScript(serviceId));

  deployQueue = deployment;

  return deployment;
}
