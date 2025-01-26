# Deploy Webhook

[![License: ISC](https://img.shields.io/github/license/nana4rider/deploy-webhook)](LICENSE)
![GitHub Actions Test](https://github.com/nana4rider/deploy-webhook/actions/workflows/test.yml/badge.svg)
![GitHub Actions Release](https://github.com/nana4rider/deploy-webhook/actions/workflows/release.yml/badge.svg)

## 概要

Webhookを介してデプロイスクリプトを実行するためのAPIです。

## 使い方

必要な環境変数については[こちら](https://github.com/nana4rider/deploy-webhook/blob/main/src/env.ts)をご確認ください。

### Production

```sh
npm install
npm run build
node dist/index
```

### Development

```sh
npm install
npm run dev
```

### Docker

```sh
docker run -d \
  --name deploy-webhook \
  -e DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/id/token \
  -e WEBHOOK_SECRET=secret \
  -p 3000:3000 \
  -v ./deploy.sh:/home/node/deploy.sh
  --restart always \
  nana4rider/deploy-webhook:latest
```

### クライアント側の実装

```sh
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$TIMESTAMP" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')
curl -f -X POST "https://deploy-webhook/webhook" \
      -H "X-Signature: $SIGNATURE" \
      -H "X-Timestamp: $TIMESTAMP"
```

## ドキュメント

- [API Document](https://nana4rider.github.io/openapi-ui/?deploy-webhook)
