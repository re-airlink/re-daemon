import express, { Application } from "express";
import compression from 'compression';
import config from "../utils/config";
import { registerRoutes } from "./routes";
import { basicAuthMiddleware, logLoginAttempts } from "./middleware";
import { errorHandler } from "../utils/errorHandler";
import { init } from "./init";  

const app: Application = express();

(async () => {
  try {
    await init();

    app.use(express.json());
    app.use(compression());
    app.use(basicAuthMiddleware)
    app.use(logLoginAttempts)

    registerRoutes(app);

    //try {
    //  initializeWebSocketServer(app);
    //} catch (error) {
    //  console.error('Failed to initialize WebSocket server:', error);
    //}

    app.use(errorHandler);

    const { port } = config;
    setTimeout(() => {
      app.listen(port, () => {
        console.info(`Daemon is running on port ${port}`);
      });
    }, 1000);
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
})();






