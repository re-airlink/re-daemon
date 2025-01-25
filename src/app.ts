import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import http from 'http';
import { initializeWebSocketServer } from './handlers/instanceHandlers';
import { init, loadRouters } from './handlers/appHandlers';

const app = express();
const server = http.createServer(app);

let config = process.env;

// Init
init();

// Custom logging middleware for basicAuth
const logLoginAttempts = (req: Request, res: Response, next: () => void) => {
  const authorizationHeader = req.headers.authorization;

  if (authorizationHeader) {
    const base64Credentials = authorizationHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    console.log(`Login attempt: Username = ${username}, Password = ${password}`);
  } else {
    console.log(`Login attempt: No Authorization header provided`);
  }

  next();
};

// Middlewares
app.use(bodyParser.json());
app.use(logLoginAttempts);
app.use(
  basicAuth({
    users: { Airlink: config.key! },
    challenge: true,
  })
);

// Load routers
loadRouters(app);

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  console.error(err);
});

initializeWebSocketServer(server);

const port = config.port;
setTimeout(() => {
  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}, 1000);