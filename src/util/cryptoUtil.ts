import env from "@/env";
import logger from "@/logger";
import crypto from "crypto";

export function verifySignature(signature: string, timestamp: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", env.WEBHOOK_SECRET)
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
