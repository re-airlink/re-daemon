import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import basicAuth from 'express-basic-auth';
const app = express();
import http from 'http';

import { initializeWebSocketServer } from './handlers/instanceHandlers';

const server = http.createServer(app);

import bodyParser from 'body-parser';
import { init, loadRouters } from './handlers/appHandlers';

let config = process.env

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
app.use((err: Error, req: Request, res: Response) => {
    console.error(err);
});

initializeWebSocketServer(server);

const port = config.port;
setTimeout(function (){
    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}, 1000);