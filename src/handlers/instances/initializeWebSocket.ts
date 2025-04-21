import { IncomingMessage, Server as HttpServer } from 'http';
import WebSocket, { Server } from 'ws';
import { attachToContainerWithWS } from './attach';
import { getContainerStats } from './utils';
import { sendCommandToContainer } from './command';
import config from "../../utils/config";
import logger from "../../utils/logger";

// Store all active WebSocket connections
const activeConnections: Set<WebSocket> = new Set();


// WebSocket server instance
let webSocketServer: Server | null = null;

export const initializeWebSocketServer = (server: HttpServer): void => {
    webSocketServer = new Server({ server });

    webSocketServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        // Add connection to active connections set
        activeConnections.add(ws);
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

            if (config.DEBUG) {
                logger.debug('WebSocket URL parts:', urlParts);
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
                    if (config.DEBUG) {
                        logger.debug(`Client authenticated for container ${containerId}`);
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
                            if (config.DEBUG) {
                                logger.debug(`Connection closed for containerstatus/${containerId}`);
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
                if (config.DEBUG) {
                    logger.debug(`Command received for container ${containerId}: ${msg.command}`);
                }
                if (msg.command) {
                    sendCommandToContainer(containerId, msg.command);
                }
            }
        });

        ws.on('close', () => {
            isAuthenticated = false;
            if (intervalHandler) clearInterval(intervalHandler);
            // Remove from active connections
            activeConnections.delete(ws);
            logger.info('WebSocket connection closed. Authentication reset.');
        });

        ws.on('error', (error: Error) => {
            logger.error('WebSocket error:', error);
        });
    });

    logger.info('WebSocket server initialized.');
};

/**
 * Close all active WebSocket connections
 */
export const closeAllWebSocketConnections = (): void => {
    logger.info(`Closing ${activeConnections.size} active WebSocket connections...`);

    // Close all active connections
    for (const ws of activeConnections) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Server shutting down');
            }
        } catch (error) {
            logger.error('Error closing WebSocket connection:', error);
        }
    }

    // Clear the set
    activeConnections.clear();

    // Close the WebSocket server if it exists
    if (webSocketServer) {
        try {
            webSocketServer.close();
            logger.info('WebSocket server closed');
        } catch (error) {
            logger.error('Error closing WebSocket server:', error);
        }
    }
};