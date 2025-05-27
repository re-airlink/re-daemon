import { Request, Response, NextFunction } from "express";
import basicAuth from "express-basic-auth";
import config from "../utils/config";
import logger from "../utils/logger";

export const basicAuthMiddleware = basicAuth({
    users: {
      Airlink: config.key,
    },
    challenge: true,
});

/**
 * Middleware to log authentication attempts
 */
export const logLoginAttempts = (req: Request, res: Response, next: () => void) => {
    const authorizationHeader = req.headers.authorization;

    if (config.DEBUG) {
      if (authorizationHeader) {
        const base64Credentials = authorizationHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username] = credentials.split(':');

        logger.debug(`Login attempt: Username = ${username}, Password = [REDACTED]`);
      } else {
        logger.debug('Login attempt: No Authorization header provided');
      }
    }

    next();
};