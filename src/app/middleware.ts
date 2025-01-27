import { Request, Response, NextFunction } from "express";
import basicAuth from "express-basic-auth";
import config from "../utils/config";

export const basicAuthMiddleware = basicAuth({
    users: {
        Airlink: config.key,
    },
    challenge: true,
});

// why is this here
export const logLoginAttempts = (req: Request, res: Response, next: () => void) => {
    const authorizationHeader = req.headers.authorization;
  
    if (authorizationHeader) {
      const credentials = Buffer.from(
        authorizationHeader.split(' ')[1] || '',
        'base64'
      ).toString('ascii');
      const [username] = credentials.split(':');
  
      console.log(`Login attempt: Username = ${username}`);
    } else {
      console.log('Login attempt: No Authorization header provided');
    }
  
    next();
};