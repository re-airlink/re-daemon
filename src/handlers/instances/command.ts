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

        const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: false, hijack: true, logs: false });

        stream.write(`${command}\n`);
        stream.end();

        stream.on('data', (data: Buffer) => {
            // Uncomment for debugging
            // logger.debug(`[${id}] STDOUT: ${data.toString()}`);
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