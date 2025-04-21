import { Request, Response, NextFunction } from "express";
import logger from "./logger";
import config from "./config";

interface CustomError extends Error {
  status?: number;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.status || 500;

  logger.error(`Request error: ${err.message}`, err);

  // Only log stack trace in development mode
  if (config.environment === "development" && err.stack) {
    logger.debug(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(config.environment === "development" && { stack: err.stack }),
  });
};
