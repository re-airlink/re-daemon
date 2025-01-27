import { docker } from "./utils";

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