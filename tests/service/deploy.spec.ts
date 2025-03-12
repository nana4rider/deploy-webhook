import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import exec from "@actions/exec";
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

describe("executeDeployScript", () => {
  const mockExecOutput = vi.fn();
  const serviceId = "test-service";

  beforeEach(() => {
    vi.clearAllMocks();

    (exec.getExecOutput as Mock).mockImplementation(mockExecOutput);
  });

  test("正常にデプロイが成功した場合、INFOログを出力する", async () => {
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
        silent: true,
      },
    );
  });

  test("デプロイが失敗した場合、エラーログを出力する", async () => {
    mockExecOutput.mockResolvedValue({
      stdout: "Deployment failed",
      exitCode: 1,
    });

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenCalledWith(
      `Deployment failed for ${serviceId}`,
    );
  });

  test("エラーがスローされた場合、エラーログを出力する", async () => {
    const error = new Error("Unexpected error");
    mockExecOutput.mockRejectedValue(error);

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenCalledWith(
      `Deployment failed for ${serviceId}`,
      error,
    );
  });
});
