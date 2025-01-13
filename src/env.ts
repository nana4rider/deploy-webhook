import { cleanEnv, num, port, str } from "envalid";

const env = cleanEnv(process.env, {
  LOG_LEVEL: str({ default: "info", desc: "ログ出力" }),
  PORT: port({
    default: 3000,
    desc: "HTTPサーバーのポート",
  }),
  DEPLOY_SCRIPT_PATH: str({
    example: "/path/to/deploy.sh",
  }),
  DISCORD_WEBHOOK_URL: str({
    example: "https://discord.com/api/webhooks/.../...",
  }),
  WEBHOOK_SECRET: str({}),
  TIME_LIMIT: num({
    default: 300,
  }),
  ERROR_LOG_PATTERN: str({
    default: "error(?!\\.log)",
  }),
  ERROR_LOG_PATTERN_FLAG: str({
    default: "i",
  }),
});

export default env;
