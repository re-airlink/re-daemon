
import { IncomingMessage } from 'http';
import WebSocket, { Server } from 'ws';
import { attachToContainerWithWS } from './attach';
import { getContainerStats } from './utils';
import { sendCommandToContainer } from './command';


export const initializeWebSocketServer = (server: any) => {
    const wss = new Server({ server });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        let isAuthenticated = false;
        let intervalHandler: NodeJS.Timeout | null = null;

        ws.on('message', async (message: WebSocket.RawData) => {
            let msg;
            let messageString = message.toString();

            try {
                msg = JSON.parse(messageString);
            } catch (error) {
                ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
                return;
            }

            const urlParts = req.url?.split('/') || [];
            const route = urlParts[1];
            const containerId = urlParts[2];

            console.log(urlParts);

            if (!containerId) {
                ws.send(JSON.stringify({ error: 'Container ID is required in the URL' }));
                ws.close(1008, 'Container ID required');
                return;
            }

            if (msg.event === 'auth' && msg.args && msg.args[0] === process.env.key) {
                if (!isAuthenticated) {
                    isAuthenticated = true;
                    console.log(`Client authenticated for container ${containerId}`);

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
                            console.log(`Connection closed for containerstatus/${containerId}`);
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
                console.log(`Command received for container ${containerId}: ${msg.command}`);
                sendCommandToContainer(containerId, msg.command);
            }
        });

        ws.on('close', () => {
            isAuthenticated = false;
            if (intervalHandler) clearInterval(intervalHandler);
            console.log('WebSocket connection closed. Authentication reset.');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('WebSocket server initialized.');
};