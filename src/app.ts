import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
const app = express();

import bodyParser from 'body-parser';
import { init, loadRouters } from './handlers/appHandlers';

let config = process.env

process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";

// Init
init();

// Middlewares
app.use(bodyParser.json());
app.use(basicAuth({
    users: { 'Airlink': config.key! },
    challenge: true,
}));

// Load routers
loadRouters(app);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send('Something has... gone wrong!');
    console.error(err);
});

const port = config.port;
setTimeout(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}, 1000);