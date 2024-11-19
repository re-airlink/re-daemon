import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const checkDirectoryExistance = (dir: string): boolean => {
    return fs.existsSync(dir);
};

export const initContainer = (id: string): string => {
    const directoryPath = path.join(__dirname, '../../volumes');

    if (!checkDirectoryExistance(directoryPath)) {
        try {
            fs.mkdirSync(directoryPath, { recursive: true });
            console.log(`Directory created: ${directoryPath}`);
        } catch (error) {
            console.error(`Error creating directory: ${error}`);
        }
    }

    const volumePath = path.join(directoryPath, id);

    if (!checkDirectoryExistance(volumePath)) {
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

const executeCommand = (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr || error.message}`);
            } else {
                resolve(stdout.trim());
            }
        });
    });
};

const deleteContainer = async (id: string): Promise<void> => {
    try {
        console.log(`Checking if container ${id} exists...`);
        const result = await executeCommand(`docker ps -a -q --filter "name=${id}"`);
        if (result) {
            console.log(`Container ${id} exists. Deleting...`);
            await executeCommand(`docker rm -f ${id}`);
            console.log(`Container ${id} successfully deleted.`);
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
    }
};

export const startContainer = async (
    id: string,
    image: string,
    env: Record<string, string> = {},
    ports: Record<string, number> = {}
): Promise<void> => {
    try {
        console.log(`Deleting existing container with ID: ${id} (if any)...`);
        const result = await executeCommand(`docker ps -a -q --filter "name=${id}"`);
        if (result) {
            await executeCommand(`docker rm -f ${id}`);
            console.log(`Container ${id} successfully deleted.`);
        }

        const volumePath = initContainer(id);
        const envOptions = Object.entries(env).map(([key, value]) => `-e ${key}=${value}`).join(' ');
        const volumeOption = `-v ${volumePath}:/data`;
        const portsOption = `-p ${ports}`;

        console.log(`Creating container ${id}...`);
        await executeCommand(`docker run -d -it --name ${id} ${volumeOption} ${portsOption} ${envOptions} ${image}`);
        console.log(`Container ${id} successfully started.`);
    } catch (error) {
        console.error(`Failed to start container ${id}: ${error}`);
    }
};

export const attachToContainer = (id: string): void => {
    try {
        console.log(`Attaching to container ${id}...`);
        const attachStream = spawn('docker', ['attach', id]);

        attachStream.stdout.on('data', (data) => {
            console.log(`[${id}] STDOUT: ${data.toString()}`);
        });

        attachStream.stderr.on('data', (data) => {
            console.error(`[${id}] STDERR: ${data.toString()}`);
        });

        attachStream.on('close', (code) => {
            console.log(`[${id}] Attach stream closed with code: ${code}`);
        });

        attachStream.on('error', (error) => {
            console.error(`Failed to attach to container ${id}: ${error}`);
        });
    } catch (error) {
        console.error(`Error attaching to container ${id}: ${error}`);
    }
};

export const sendCommandToContainer = (id: string, command: string): void => {
    try {
        const dockerAttach = spawn('docker', ['attach', id], {
            stdio: ['pipe', 'inherit', 'inherit']
        });

        dockerAttach.stdin.write(`${command}\n`);
        dockerAttach.stdin.end();

        dockerAttach.on('error', (error) => {
            console.error(`Failed to attach to container ${id}: ${error.message}`);
        });

        dockerAttach.on('close', (code) => {
            if (code === 0) {
                console.log(`Command '${command}' sent successfully to container ${id}.`);
            } else {
                console.error(`Attach process for container ${id} exited with code ${code}.`);
            }
        });
    } catch (error) {
        console.error(`Error in sendCommandToContainer: ${error}`);
    }
};

export const stopContainer = async (id: string, stopCmd?: string): Promise<void> => {
    try {
        console.log(`Checking if container ${id} exists...`);
        const containerExists = await executeCommand(`docker ps -q --filter "name=${id}"`);

        if (!containerExists) {
            console.log(`Container ${id} is not running.`);
            return;
        }

        if (stopCmd) {
            console.log(`Executing stop command in container ${id}: ${stopCmd}`);
            sendCommandToContainer(id, stopCmd);
            console.log(`Stop command executed successfully in container ${id}.`);
        }

        console.log(`Stopping container ${id}...`);
        await executeCommand(`docker stop ${id}`);
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
        await executeCommand(`docker rm -f ${id}`);
        console.log(`Container ${id} successfully killed.`);
    } catch (error) {
        console.error(`Failed to kill container ${id}: ${error}`);
    }
};