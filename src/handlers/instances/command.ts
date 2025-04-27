import { docker } from './utils';
import logger from '../../utils/logger';

export const sendCommandToContainer = async (id: string, command: string): Promise<void> => {
    try {
        logger.info(`Sending command to container ${id}: ${command}`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();

        if (!containerInfo.State.Running) {
            logger.warn(`Container ${id} is not running.`);
            return;
        }

        // Instead of using exec, let's use attach which is more reliable for sending commands
        const stream = await container.attach({
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true,
            hijack: true
        });

        // Write the command to the container's stdin
        stream.write(`${command}\n`);

        // Handle stream events
        stream.on('data', (_data: Buffer) => {
            // Uncomment for debugging
            // logger.debug(`[${id}] STDOUT: ${_data.toString()}`);
        });

        stream.on('error', (error: Error) => {
            logger.error(`[${id}] Stream error:`, error);
        });

        stream.on('end', () => {
            logger.debug(`[${id}] Command stream ended.`);
        });
    } catch (error) {
        logger.error(`Failed to send command to container ${id}:`, error);
    }
};