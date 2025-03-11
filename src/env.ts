import { cleanEnv, num, port, str, testOnly, url } from "envalid";

const env = cleanEnv(process.env, {
  LOG_LEVEL: str({ default: "info", desc: "ログ出力" }),
  PORT: port({
    desc: "HTTPサーバーのポート",
    default: 3000,
  }),
  DEPLOY_SCRIPT_PATH: str({
    desc: "デプロイスクリプトのパス",
    default: "./deploy.sh",
    example: "/path/to/deploy.sh",
    devDefault: testOnly("/path/to/deploy.sh"),
  }),
  DISCORD_WEBHOOK_URL: url({
    desc: "Discord WebhookのURL",
    example: "https://discord.com/api/webhooks/.../...",
    devDefault: testOnly("http://webhook-test.local"),
  }),
  DISCORD_MENTION: str({
    desc: "Discord Webhookエラー時に付与するメンション",
    default: "@everyone",
    example: "<@&ROLE_ID> / @everyone / @here",
  }),
  WEBHOOK_SECRET: str({
    desc: "クライアントに共有しているシークレット",
    devDefault: testOnly("secret"),
  }),
  TIME_LIMIT: num({
    default: 30,
  }),
});

export default env;
