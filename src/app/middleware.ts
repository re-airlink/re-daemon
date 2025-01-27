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
      const base64Credentials = authorizationHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');
  
      console.log(`Login attempt: Username = ${username}, Password = ${password}`);
    } else {
      console.log('Login attempt: No Authorization header provided');
    }
  
    next();
};