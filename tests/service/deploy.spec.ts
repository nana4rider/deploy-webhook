import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import * as child_process from "child_process";

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof child_process>("child_process");
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

type ExecFileCallbackOnly = (
  command: string,
  args: string[],
  callback: (
    error: Error | null,
    result: { stdout: string; stderr: string },
  ) => void,
) => child_process.ChildProcess;

vi.mock("@/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.clearAllMocks();
});

describe("executeDeployScript", () => {
  const mockExecFile = vi.mocked(
    child_process.execFile as ExecFileCallbackOnly,
  );
  const serviceId = "test-service";

  test("コマンドが正しく設定される", async () => {
    mockExecFile.mockImplementation((_command, _args, callback) => {
      callback(null, { stdout: "Deployment succeeded", stderr: "" });
      return {} as child_process.ChildProcess;
    });

    await executeDeployScript(serviceId);

    expect(mockExecFile).toHaveBeenCalledTimes(1);
    expect(mockExecFile.mock.calls[0][0]).toBe(env.DEPLOY_SCRIPT_PATH);
    expect(mockExecFile.mock.calls[0][1]).toEqual([serviceId]);
  });

  test("正常にデプロイが成功した場合、INFOログを出力する", async () => {
    mockExecFile.mockImplementation((_command, _args, callback) => {
      callback(null, { stdout: "Deployment succeeded", stderr: "" });
      return {} as child_process.ChildProcess;
    });

    await executeDeployScript(serviceId);

    expect(logger.info).toHaveBeenLastCalledWith(
      `Deployment succeeded for ${serviceId}`,
    );
  });

  test("デプロイが失敗した場合、エラーログを出力する", async () => {
    const error = new Error("Unexpected error");
    mockExecFile.mockImplementation((_command, _args, callback) => {
      callback(error, {
        stdout: "",
        stderr: "",
      });
      return {} as child_process.ChildProcess;
    });

    await executeDeployScript(serviceId);

    expect(logger.error).toHaveBeenLastCalledWith(
      `Deployment failed for ${serviceId}`,
      error,
    );
  });
});
