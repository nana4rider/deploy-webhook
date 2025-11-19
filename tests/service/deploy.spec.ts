import env from "@/env";
import logger from "@/logger";
import executeDeployScript from "@/service/deploy";
import * as child_process from "child_process";

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof child_process>("child_process");
  return {
    ...actual,
    exec: vi.fn(),
  };
});

type ExecCallbackOnly = (
  command: string,
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
  const mockExec = vi.mocked(child_process.exec as ExecCallbackOnly);
  const serviceId = "test-service";

  test("正常にデプロイが成功した場合、INFOログを出力する", async () => {
    mockExec.mockImplementation((_command, callback) => {
      callback(null, { stdout: "Deployment succeeded", stderr: "" });
      return {} as child_process.ChildProcess;
    });

    await executeDeployScript(serviceId);

    expect(logger.info).toHaveBeenLastCalledWith(
      `Deployment succeeded for ${serviceId}`,
    );
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec.mock.calls[0][0]).toBe(
      `${env.DEPLOY_SCRIPT_PATH} ${serviceId}`,
    );
  });

  test("デプロイが失敗した場合、エラーログを出力する", async () => {
    const error = new Error("Unexpected error");
    mockExec.mockImplementation((_command, callback) => {
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
