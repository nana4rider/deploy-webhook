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

  test("キューへの追加時とデプロイ開始時にINFOログを出力する", async () => {
    mockExecFile.mockImplementation((_command, _args, callback) => {
      callback(null, { stdout: "Deployment succeeded", stderr: "" });
      return {} as child_process.ChildProcess;
    });

    const deployment = executeDeployScript(serviceId);

    expect(logger.info).toHaveBeenCalledWith(
      `Deployment queued for ${serviceId}`,
    );

    await deployment;

    expect(logger.info).toHaveBeenCalledWith(
      `Deployment started for ${serviceId}`,
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

  test("複数のデプロイを受け付けた場合、一つずつ順番に実行する", async () => {
    const callbacks: Array<
      (error: Error | null, result: { stdout: string; stderr: string }) => void
    > = [];
    mockExecFile.mockImplementation((_command, _args, callback) => {
      callbacks.push(callback);
      return {} as child_process.ChildProcess;
    });

    const firstDeployment = executeDeployScript("first-service");
    const secondDeployment = executeDeployScript("second-service");

    await vi.waitFor(() => expect(mockExecFile).toHaveBeenCalledTimes(1));
    expect(mockExecFile.mock.calls[0][1]).toEqual(["first-service"]);

    callbacks[0](null, { stdout: "Deployment succeeded", stderr: "" });

    await vi.waitFor(() => expect(mockExecFile).toHaveBeenCalledTimes(2));
    expect(mockExecFile.mock.calls[1][1]).toEqual(["second-service"]);

    callbacks[1](null, { stdout: "Deployment succeeded", stderr: "" });
    await Promise.all([firstDeployment, secondDeployment]);
  });

  test("先行するデプロイが失敗しても後続のデプロイを実行する", async () => {
    mockExecFile
      .mockImplementationOnce((_command, _args, callback) => {
        callback(new Error("Deployment failed"), { stdout: "", stderr: "" });
        return {} as child_process.ChildProcess;
      })
      .mockImplementationOnce((_command, _args, callback) => {
        callback(null, { stdout: "Deployment succeeded", stderr: "" });
        return {} as child_process.ChildProcess;
      });

    await Promise.all([
      executeDeployScript("failed-service"),
      executeDeployScript("next-service"),
    ]);

    expect(mockExecFile).toHaveBeenCalledTimes(2);
    expect(mockExecFile.mock.calls[1][1]).toEqual(["next-service"]);
  });
});
