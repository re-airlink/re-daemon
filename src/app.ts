import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import basicAuth from 'express-basic-auth';
import http from 'http';
import { initializeWebSocketServer } from './handlers/instanceHandlers';
import { init, loadRouters } from './handlers/appHandlers';
import compression from 'compression';

const app = express();
const server = http.createServer(app);

const config = {
  key: process.env.KEY || '',
  port: parseInt(process.env.PORT || '3000', 10),
};

if (!config.key) {
  throw new Error('Missing KEY environment variable');
}

// Init
init();

// why is this here
const logLoginAttempts = (req: Request, res: Response, next: () => void) => {
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

// Middlewares
app.use(express.json());
app.use(logLoginAttempts);
app.use(compression());
app.use(
  basicAuth({
    users: { Airlink: config.key },
    challenge: true,
  })
);

// Load routers
loadRouters(app);

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  console.error(err);
});

try {
  initializeWebSocketServer(server);
} catch (error) {
  console.error('Failed to initialize WebSocket server:', error);
}

setTimeout(() => {
  server.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });
}, 1000);