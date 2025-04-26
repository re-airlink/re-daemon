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

        // Create a clean stream without including the attach options in the output
        const exec = await container.exec({
            Cmd: ['sh', '-c', command],
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start({
            hijack: true,
            stdin: false,
            stdout: true,
            stderr: true
        });

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