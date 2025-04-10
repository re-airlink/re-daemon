
import { IncomingMessage, Server as HttpServer } from 'http';
import WebSocket, { Server } from 'ws';
import { attachToContainerWithWS } from './attach';
import { getContainerStats } from './utils';
import { sendCommandToContainer } from './command';
import config from "../../utils/config";


export const initializeWebSocketServer = (server: HttpServer): void => {
    const wss = new Server({ server });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        let isAuthenticated = false;
        let intervalHandler: NodeJS.Timeout | null = null;

        ws.on('message', async (message: WebSocket.RawData) => {
            let msg: { event: string; args?: string[]; command?: string } | null = null;
            const messageString = message.toString();

            try {
                msg = JSON.parse(messageString);
            } catch (error) {
                ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
                return;
            }

            const urlParts = req.url?.split('/') || [];
            const route = urlParts[1];
            const containerId = urlParts[2];

            if (config.DEBUG == true) {
            console.log(urlParts);
            }

            if (!containerId) {
                ws.send(JSON.stringify({ error: 'Container ID is required in the URL' }));
                ws.close(1008, 'Container ID required');
                return;
            }

            if (!msg || !msg.event) {
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
                ws.close(1008, 'Invalid message format');
                return;
            }

            if (msg.event === 'auth' && msg.args && msg.args[0] === process.env.key) {
                if (!isAuthenticated) {
                    isAuthenticated = true;
                    if (config.DEBUG == true) {
                    console.log(`[DEBUG] Client authenticated for container ${containerId}`);
                    }

                    if (route === 'container') {
                        await attachToContainerWithWS(containerId, ws);
                    } else if (route === 'containerstatus') {
                        const stats2 = await getContainerStats(containerId);
                        if (stats2 && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ event: 'status', data: stats2 }));
                        }

                        intervalHandler = setInterval(async () => {
                            const stats = await getContainerStats(containerId);
                            if (stats && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ event: 'status', data: stats }));
                            }
                        }, 2000);

                        ws.on('close', () => {
                            if (intervalHandler) clearInterval(intervalHandler);
                            if (config.DEBUG == true) {
                            console.log(`[DEBUG] Connection closed for containerstatus/${containerId}`);
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({ error: `Invalid route: ${route}` }));
                        ws.close(1008, 'Invalid route');
                    }
                }
            } else if (!isAuthenticated) {
                ws.send(JSON.stringify({ error: 'Authentication required' }));
                ws.close(1008, 'Authentication required');
                return;
            }

            if (isAuthenticated && msg.event === 'CMD' && route === 'container') {
                if (config.DEBUG == true) {
                console.log(`[DEBUG] Command received for container ${containerId}: ${msg.command}`);
                }
                if (msg.command) {
                    sendCommandToContainer(containerId, msg.command);
                }
            }
        });

        ws.on('close', () => {
            isAuthenticated = false;
            if (intervalHandler) clearInterval(intervalHandler);
            console.log('[INFO] WebSocket connection closed. Authentication reset.');
        });

        ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('[INFO] WebSocket server initialized.');
};