import http from "http";
import express, { Application } from "express";
import compression from "compression";
import config from "../utils/config";
import { registerRoutes } from "./routes";
import { basicAuthMiddleware, logLoginAttempts } from "./middleware";
import { errorHandler } from "../utils/errorHandler";
import { initializeWebSocketServer } from "../handlers/instances/initializeWebSocket";
import { init } from "./init";
import { initLogger } from '../handlers/stats';

const app: Application = express();
const server = http.createServer(app);

(async () => {
  try {
    initLogger();
    await init();

    app.use(express.json());
    app.use(compression());
    app.use(basicAuthMiddleware);
    app.use(logLoginAttempts);

    registerRoutes(app);

    app.use(errorHandler);

    initializeWebSocketServer(server);

    const { port } = config;
    setTimeout(() => {
      server.listen(port, () => {
        console.info(`Daemon is running on port ${port}`);
      });
    }, 1000);
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
})();
