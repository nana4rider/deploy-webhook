import { cleanEnv, num, port, str, url } from "envalid";

const env = cleanEnv(process.env, {
  LOG_LEVEL: str({ default: "info", desc: "ログ出力" }),
  PORT: port({
    desc: "HTTPサーバーのポート",
    default: 3000,
  }),
  DEPLOY_SCRIPT_PATH: str({
    desc: "デプロイスクリプトの場所",
    example: "/path/to/deploy.sh",
  }),
  DISCORD_WEBHOOK_URL: url({
    desc: "Discord WebhookのURL",
    example: "https://discord.com/api/webhooks/.../...",
  }),
  WEBHOOK_SECRET: str({}),
  TIME_LIMIT: num({
    default: 60,
  }),
});

export default env;
