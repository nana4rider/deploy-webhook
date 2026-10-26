import { cleanEnv, num, port, str } from "envalid";

const env = cleanEnv(process.env, {
  LOG_LEVEL: str({ default: "info", desc: "ログ出力" }),
  PORT: port({
    desc: "HTTPサーバーのポート",
    default: 3000,
    testDefault: 0,
  }),
  DEPLOY_SCRIPT_PATH: str({
    desc: "デプロイスクリプトのパス",
    default: "./deploy.sh",
    example: "/path/to/deploy.sh",
    testDefault: "/path/to/deploy.sh",
  }),
  WEBHOOK_SECRET: str({
    desc: "クライアントに共有しているシークレット",
    testDefault: "secret",
  }),
  TIME_LIMIT: num({
    default: 30,
  }),
});

export default env;
