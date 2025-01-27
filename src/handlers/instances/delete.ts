import fs from 'fs';
import path from 'path';

import { docker } from './utils';

export const deleteContainer = async (id: string): Promise<void> => {
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

export const deleteContainerAndVolume = async (id: string): Promise<void> => {
    try {
        console.log(`Deleting container ${id}...`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect().catch(() => null);
        if (containerInfo) {
            console.log(`Container ${id} exists. Deleting...`);
            await deleteContainer(id);
            // 1st suspect __dirname
            const volumePath = path.join(__dirname, '../../../volumes', id);
            fs.rmSync(volumePath, { recursive: true, force: true });
            console.log(`Container ${id} successfully deleted.`);
        } else {
            console.log(`Container ${id} does not exist.`);
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
    }
}