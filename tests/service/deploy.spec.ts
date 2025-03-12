import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import exec from "@actions/exec";
import { WebhookClient } from "discord.js";
import { Mock } from "vitest";

vi.mock("@/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@actions/exec", () => ({
  default: {
    getExecOutput: vi.fn(),
  },
}));

vi.mock("discord.js", () => ({
  WebhookClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
}));

describe("executeDeployScript", () => {
  const mockWebhookSend = vi.fn();
  const mockExecOutput = vi.fn();
  const serviceId = "test-service";

  beforeEach(() => {
    vi.clearAllMocks();

    (WebhookClient as unknown as Mock).mockImplementation(() => ({
      send: mockWebhookSend,
    }));

    (exec.getExecOutput as Mock).mockImplementation(mockExecOutput);
  });

  test("正常にデプロイが成功した場合、成功メッセージを送信する", async () => {
    mockExecOutput.mockResolvedValue({
      stdout: "Deployment succeeded",
      exitCode: 0,
    });

    await executeDeployScript(serviceId);

    expect(logger.info).toHaveBeenCalledWith(
      `Webhook received and verified: ${serviceId}`,
    );
    expect(mockExecOutput).toHaveBeenCalledWith(
      env.DEPLOY_SCRIPT_PATH,
      [serviceId],
      {
        ignoreReturnCode: true,
      },
    );

    expect(mockWebhookSend).toHaveBeenCalledWith({
      embeds: [
        {
          title: "Success: Deploy",
          description: `Service ID: ${serviceId}`,
          color: expect.any(Number) as number,
        },
      ],
      files: [
        {
          attachment: Buffer.from("Deployment succeeded", "utf-8"),
          name: expect.stringMatching(/^deploy_\d+\.log$/) as string,
        },
      ],
    });
  });

  test("デプロイが失敗した場合、失敗メッセージを送信する", async () => {
    mockExecOutput.mockResolvedValue({
      stdout: "Deployment failed",
      exitCode: 1,
    });

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenCalledWith(
      `Deployment failed for ${serviceId}`,
    );
    expect(mockWebhookSend).toHaveBeenCalledWith({
      content: "@everyone",
      embeds: [
        {
          title: "Failure: Deploy",
          description: `Service ID: ${serviceId}`,
          color: expect.any(Number) as number,
        },
      ],
      files: [
        {
          attachment: Buffer.from("Deployment failed", "utf-8"),
          name: expect.stringMatching(/^deploy_\d+\.log$/) as string,
        },
      ],
    });
  });

  test("エラーがスローされた場合、エラーメッセージを送信する", async () => {
    const error = new Error("Unexpected error");
    mockExecOutput.mockRejectedValue(error);

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenCalledWith(
      `Deployment failed for ${serviceId}`,
      error,
    );
    expect(mockWebhookSend).toHaveBeenCalledWith({
      content: "@everyone",
      embeds: [
        {
          title: "Failure: Execute Deploy Script",
          description: `Service ID: ${serviceId}`,
          color: expect.any(Number) as number,
        },
      ],
      files: [
        {
          attachment: Buffer.from(error.stack || error.message, "utf-8"),
          name: expect.stringMatching(/^deploy_\d+\.log$/) as string,
        },
      ],
    });
  });

  test("Webhookの送信でエラーが発生してもロギングする", async () => {
    const error = new Error("Webhook error");

    mockExecOutput.mockResolvedValue({
      stdout: "Deployment failed",
      exitCode: 1,
    });
    mockWebhookSend.mockRejectedValue(error);

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenCalledWith("webhook error", error);
  });
});
