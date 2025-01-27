import { docker } from './utils';
import { sendCommandToContainer } from './command';
import { deleteContainer } from './delete';

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

