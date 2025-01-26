import Docker from 'dockerode';
import WebSocket, { Server } from 'ws';
import fs from 'fs';
import path from 'path';
import { IncomingMessage } from 'http';
import Dockerode from 'dockerode';

const docker = new Docker({ socketPath: process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock" });

const checkDirectoryExistence = (dir: string): boolean => {
    return fs.existsSync(dir);
};

export const initContainer = (id: string): string => {
    const directoryPath = path.join(__dirname, '../../volumes');

    if (!checkDirectoryExistence(directoryPath)) {
        try {
            fs.mkdirSync(directoryPath, { recursive: true });
            console.log(`Directory created: ${directoryPath}`);
        } catch (error) {
            console.error(`Error creating directory: ${error}`);
        }
    }

    const volumePath = path.join(directoryPath, id);

    if (!checkDirectoryExistence(volumePath)) {
        try {
            fs.mkdirSync(volumePath, { recursive: true });
            console.log(`Volume directory created: ${volumePath}`);
        } catch (error) {
            console.error(`Error creating volume directory: ${error}`);
        }
    }

    console.log(`Initialization complete for container: ${id}`);
    return volumePath;
};

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

const deleteContainer = async (id: string): Promise<void> => {
    try {
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect().catch(() => null);
        if (containerInfo) {
            console.log(`Container ${id} exists. Deleting...`);
            await container.remove({ force: true });
            console.log(`Container ${id} successfully deleted.`);
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
    }
};

const parsePortBindings = (ports: string): Record<string, Array<{ HostPort: string }>> => {
    const result: Record<string, Array<{ HostPort: string }>> = {};
    const mappings = ports.split(',');

    mappings.forEach((mapping) => {
        const [hostPort, containerPort] = mapping.split(':');

        if (hostPort && containerPort && !isNaN(Number(hostPort)) && !isNaN(Number(containerPort))) {
            result[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
        } else {
            console.warn(`Invalid port mapping: ${mapping}`);
        }
    });

    return result;
};


export const startContainer = async (
    id: string,
    image: string,
    env: Record<string, string> = {},
    ports: string = '',
    Memory: number,
    Cpu: number
): Promise<void> => {
    try {
        console.log(`Deleting existing container with ID: ${id} (if any)...`);
        await deleteContainer(id);

        const volumePath = initContainer(id);
        const portBindings = parsePortBindings(ports);

        console.log(`Creating and starting container ${id}...`);
        await docker.createContainer({
            name: id,
            Image: image,
            Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
            HostConfig: {
                Binds: [`${volumePath}:/app/data`],
                PortBindings: portBindings,
                Memory: Memory * 1024 * 1024,
                CpuCount: Cpu,
                NetworkMode: 'host'
            },
            AttachStdout: true,
            AttachStderr: true,
            AttachStdin: true,
            OpenStdin: true,
            Tty: true,
        }).then((container) => container.start());
        console.log(`Container ${id} successfully started.`);
    } catch (error) {
        console.error(`Failed to start container ${id}: ${error}`);
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

export const sendCommandToContainer = async (id: string, command: string): Promise<void> => {
    try {
        console.log(`Sending command to container ${id}: ${command}`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();

        if (!containerInfo.State.Running) {
            console.error(`Container ${id} is not running.`);
            return;
        }

        const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: false, hijack: true, logs: false });

        stream.write(`${command}\n`);
        stream.end();

        stream.on('data', (data: Buffer) => {
            //console.log(`[${id}] STDOUT: ${data.toString()}`);
        });

        stream.on('error', (error: Error) => {
            console.error(`[${id}] Error: ${error.message}`);
        });

        stream.on('end', () => {
            console.log(`[${id}] Command stream ended.`);
        });
    } catch (error) {
        console.error(`Failed to send command to container ${id}: ${error}`);
    }
};


export const stopContainer = async (id: string, stopCmd?: string): Promise<void> => {
    try {
        console.log(`Checking if container ${id} exists...`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect().catch(() => null);

        if (!containerInfo || !containerInfo.State.Running) {
            console.log(`Container ${id} is not running.`);
            return;
        }

        if (stopCmd) {
            console.log(`Executing stop command in container ${id}: ${stopCmd}`);
            await sendCommandToContainer(id, stopCmd);
        }

        console.log(`Stopping container ${id}...`);
        await container.stop();
        console.log(`Container ${id} stopped successfully.`);

        console.log(`Removing container ${id}...`);
        await deleteContainer(id);
    } catch (error) {
        console.error(`Failed to stop container ${id}: ${error}`);
    }
};

export const killContainer = async (id: string): Promise<void> => {
    try {
        console.log(`Forcefully killing container ${id}...`);
        const container = docker.getContainer(id);
        await container.remove({ force: true });
        console.log(`Container ${id} successfully killed.`);
    } catch (error) {
        console.error(`Failed to kill container ${id}: ${error}`);
    }
};

export const deleteContainerAndVolume = async (id: string): Promise<void> => {
    try {
        console.log(`Deleting container ${id}...`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect().catch(() => null);
        if (containerInfo) {
            console.log(`Container ${id} exists. Deleting...`);
            await deleteContainer(id);
            const volumePath = path.join(__dirname, '../../volumes', id);
            fs.rmSync(volumePath, { recursive: true, force: true });
            console.log(`Container ${id} successfully deleted.`);
        } else {
            console.log(`Container ${id} does not exist.`);
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
    }
}

const getContainerStats = async (id: string) => {
    try {
        const container = docker.getContainer(id);
        const statsStream = await container.stats({ stream: false });

        const memoryUsage = statsStream.memory_stats.usage;
        const memoryLimit = statsStream.memory_stats.limit;
        const memoryPercentage = ((memoryUsage / memoryLimit) * 100).toFixed(2);

        const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage - statsStream.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta = statsStream.cpu_stats.system_cpu_usage - statsStream.precpu_stats.system_cpu_usage;
        const cpuUsage = ((cpuDelta / systemCpuDelta) * statsStream.cpu_stats.online_cpus * 100).toFixed(2);

        const storageStats = await container.inspect();
        const storageUsage = 200;
        return {
            memory: {
                usage: memoryUsage,
                limit: memoryLimit,
                percentage: memoryPercentage,
            },
            cpu: {
                percentage: cpuUsage,
            },
            storage: {
                usage: storageUsage,
            },
        };
    } catch (error) {
        console.error(`Error fetching stats for container ${id}:`, error);
        return null;
    }
};

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