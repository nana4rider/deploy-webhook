# Deploy Webhook

[![License: ISC](https://img.shields.io/github/license/nana4rider/deploy-webhook)](LICENSE)
![GitHub Actions Test](https://github.com/nana4rider/deploy-webhook/actions/workflows/test.yml/badge.svg)
![GitHub Actions Release](https://github.com/nana4rider/deploy-webhook/actions/workflows/release.yml/badge.svg)

## 概要

[GitHub Actions](https://docs.github.com/ja/actions)からデプロイスクリプトを実行するためのAPIです。

## 使い方

### Native

```sh
npm install
npm run build
node --env-file=.env dist/index
```

### Docker

```sh
docker run -d \
  --name deploy-webhook \
  --env-file .env \
  -p 3000:3000 \
  -v ./deploy.sh:/app/deploy.sh
  --restart always \
  ghcr.io/nana4rider/deploy-webhook:latest
```

> [!TIP]
> 必要な環境変数については[こちら](src/env.ts)をご確認ください。

### GitHub Actions側の実装

```sh
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$TIMESTAMP" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')
curl -f -X POST "https://deploy-webhook/webhook" \
      -H "X-Signature: $SIGNATURE" \
      -H "X-Timestamp: $TIMESTAMP"
```

## ドキュメント

- [API Document](https://nana4rider.github.io/openapi-ui/?deploy-webhook)
