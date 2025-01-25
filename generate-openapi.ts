import logger from "@/logger";
import { route } from "@/service/http";
import swagger from "@fastify/swagger";
import assert from "assert";
import fastify from "fastify";
import fs from "fs/promises";
import { description, version } from "~/package.json";

const TITLE = "Deploy Webhook";

assert(typeof version === "string");
assert(typeof description === "string");

const server = fastify();

await server.register(swagger, {
  openapi: {
    info: {
      title: TITLE,
      description,
      version,
    },
    servers: [
      {
        url: "http://localhost:{port}",
        description: "Local server",
        variables: {
          port: {
            default: "3000",
          },
        },
      },
    ],
  },
});

route(server);

try {
  await server.ready();

  const swaggerJson = server.swagger();

  await fs.writeFile(
    "docs/openapi.json",
    JSON.stringify(swaggerJson, null, 2) + "\n",
  );

  logger.info("Swagger JSON has been saved to swagger.json");
} catch (err) {
  logger.error("Error generating Swagger JSON:", err);
} finally {
  await server.close();
}
