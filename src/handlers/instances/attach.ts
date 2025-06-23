import { docker } from './utils';
import WebSocket, { Server } from 'ws';

export const attachToContainerWithWS = async (id: string, ws: WebSocket): Promise<void> => {
    try {
        console.log(`Attaching to container ${id}...`);
        const container = docker.getContainer(id);

        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: 100
        });

        logStream.on('data', chunk => {
            ws.send(chunk.toString());
        });

        ws.on('close', () => {
            console.log(`WebSocket connection closed for container ${id}`);
        });

        console.log(`Attached to container ${id} successfully.`);
    } catch (error) {
        console.error(`Failed to attach to container ${id}:`, error);
        
        if (ws.readyState === WebSocket.OPEN) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            ws.send(JSON.stringify({ error: `Failed to attach to container ${id}: ${errorMessage}` }));
        }
    }
};

export const attachToContainer = async (id: string): Promise<void> => {
    try {
        console.log(`Attaching to container ${id}...`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();

        if (!containerInfo.State.Running) {
            console.error(`Container ${id} is not running.`);
            return;
        }

        const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
        stream.pipe(process.stdout);

        console.log(`[${id}] Attached successfully.`);
    } catch (error) {
        console.error(`Failed to attach to container ${id}: ${error}`);
    }
};