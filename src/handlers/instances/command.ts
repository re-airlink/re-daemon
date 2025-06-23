import { docker } from './utils';

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