import env from "@/env";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: env.LOG_LEVEL,
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    trace: 4,
    debug: 5,
  },
  format: format.combine(
    format.errors({ stack: true }),
    format.colorize(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.printf(({ timestamp, level, message, stack }) => {
      let log = `[${timestamp as string}] [${level}]: ${message as string}`;
      if (typeof stack === "string") {
        log = `${log}\n${stack}`;
      }
      return log;
    }),
  ),
  transports: [
    new transports.Console({
      level: "error",
      stderrLevels: ["error"],
      consoleWarnLevels: ["warn"],
    }),
    new transports.Console({
      level: "info",
      stderrLevels: [],
    }),
  ],
});

export default logger;
