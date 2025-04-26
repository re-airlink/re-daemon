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
    let containerDeleted = false;
    let volumeDeleted = false;
    let containerError = null;
    let volumeError = null;

    try {
        console.log(`Deleting container ${id}...`);
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect().catch(() => null);

        if (containerInfo) {
            console.log(`Container ${id} exists. Deleting...`);
            await deleteContainer(id);
            console.log(`Container ${id} successfully deleted.`);
            containerDeleted = true;
        } else {
            console.log(`Container ${id} does not exist.`);
            containerDeleted = true; // Consider it "deleted" if it doesn't exist
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
        containerError = error;
    }

    try {
        const volumePath = path.resolve(process.cwd(), 'volumes', id);
        console.log(`Deleting volume at path: ${volumePath}`);

        if (fs.existsSync(volumePath)) {
            fs.rmSync(volumePath, { recursive: true, force: true });
            console.log(`Volume for ${id} successfully deleted.`);
            volumeDeleted = true;
        } else {
            console.log(`Volume path ${volumePath} does not exist.`);
            volumeDeleted = true;
        }
    } catch (error) {
        console.error(`Failed to delete volume for ${id}: ${error}`);
        volumeError = error;
    }

    if (!containerDeleted && !volumeDeleted) {
        throw new Error(`Failed to delete container and volume: Container error: ${containerError}, Volume error: ${volumeError}`);
    } else if (!containerDeleted) {
        throw new Error(`Failed to delete container: ${containerError}`);
    } else if (!volumeDeleted) {
        throw new Error(`Failed to delete volume: ${volumeError}`);
    }
    console.log(`Delete operation for ${id} completed. Container: ${containerDeleted ? 'Success' : 'Failed'}, Volume: ${volumeDeleted ? 'Success' : 'Failed'}`);
}