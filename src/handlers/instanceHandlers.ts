import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const checkDirectoryExistence = (dir: string): boolean => fs.existsSync(dir);

const createDirectory = (dir: string): void => {
    if (!checkDirectoryExistence(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Directory created: ${dir}`);
        } catch (error) {
            console.error(`Error creating directory ${dir}: ${error}`);
            throw error;
        }
    }
};

const executeCommand = (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Command failed: ${command}\nError: ${stderr || error.message}`);
            } else {
                resolve(stdout.trim());
            }
        });
    });
};

export const initContainer = (id: string): string => {
    const basePath = path.resolve(__dirname, '../../volumes');
    createDirectory(basePath);

    const volumePath = path.join(basePath, id);
    createDirectory(volumePath);

    console.log(`Initialization complete for container: ${id}`);
    return volumePath;
};

/**
 * Creates a new Docker container instance with the specified parameters.
 * 
 * @param id The unique identifier for the container.
 * @param image The Docker image to use for the container.
 * @param env An optional record of environment variables to set inside the container.
 * @param ports An optional record of port mappings from the host to the container.
 * @param volumeSubPath An optional sub-path for the volume to be mounted inside the container.
 * @returns A promise that resolves when the container is successfully created and running.
 * @throws An error if the creation process fails.
 */
export const createInstance = async (
    id: string,
    image: string,
    env: Record<string, string> = {},
    ports: Record<string, number> = {},
    volumeSubPath: string = 'default'
): Promise<void> => {
    try {
        console.log(`Creating instance '${id}' with image '${image}'...`);
        
        const isContainerRunning = await executeCommand(`docker ps -q --filter "name=${id}"`);
        if (isContainerRunning) {
            console.log(`Container '${id}' already exists.`);
            return; 
        }

        const baseVolumePath = path.resolve(__dirname, '../../volumes');
        const instanceVolumePath = path.join(baseVolumePath, id, volumeSubPath);
        createDirectory(instanceVolumePath);

        const envOptions = Object.entries(env)
            .map(([key, value]) => `-e ${key}=${value}`)
            .join(' ');

        const portsOptions = Object.entries(ports)
            .map(([containerPort, hostPort]) => `-p ${hostPort}:${containerPort}`)
            .join(' ');

        const volumeOption = `-v ${instanceVolumePath}:/data`;

        console.log(`Starting container '${id}'...`);
        await executeCommand(
            `docker run -d --name ${id} ${volumeOption} ${portsOptions} ${envOptions} ${image}`
        );
        console.log(`Instance '${id}' started successfully.`);
    } catch (error) {
        console.error(`Failed to create instance '${id}': ${error}`);
        throw error;
    }
};

/**
 * Starts a container with the specified ID and image.
 * If the container already exists, it is deleted first.
 * The container is started with the specified environment variables and port mappings.
 * The container's volume is initialized at the specified path within the container.
 * If the container is successfully started, logs a message indicating so.
 * If the start process fails, logs an error message with the error and throws the error.
 * 
 * @param id The ID of the container to be started.
 * @param image The Docker image to use for the container.
 * @param env An optional record of environment variables to set inside the container.
 * @param ports An optional record of port mappings from the host to the container.
 */
export const startContainer = async (
    id: string,
    image: string,
    env: Record<string, string> = {},
    ports: Record<string, number> = {}
): Promise<void> => {
    try {
        await deleteContainer(id);

        const volumePath = initContainer(id);
        const envOptions = Object.entries(env)
            .map(([key, value]) => `-e ${key}=${value}`)
            .join(' ');

        const volumeOption = `-v ${volumePath}:/data`;
        const portsOptions = `-p ${ports}`;

        console.log(`Starting container ${id} with image ${image}...`);
        await executeCommand(`docker run -d -it --name ${id} ${volumeOption} ${portsOptions} ${envOptions} ${image}`);
        console.log(`Container ${id} started successfully.`);
    } catch (error) {
        console.error(`Failed to start container ${id}: ${error}`);
    }
};

/**
 * Deletes a container with the specified ID if it exists.
 * Logs the process of checking for the container's existence and its deletion.
 * If the container does not exist, logs a message indicating so.
 * Throws an error if the deletion process fails.
 * 
 * @param id The ID of the container to be deleted.
 * @throws Will throw an error if the command to delete the container fails.
 */
export const deleteContainer = async (id: string): Promise<void> => {
    try {
        console.log(`Checking if container ${id} exists...`);
        const result = await executeCommand(`docker ps -a -q --filter "name=${id}"`);
        if (result) {
            console.log(`Deleting container ${id}...`);
            await executeCommand(`docker rm -f ${id}`);
            console.log(`Container ${id} deleted successfully.`);
        } else {
            console.log(`Container ${id} does not exist.`);
        }
    } catch (error) {
        console.error(`Failed to delete container ${id}: ${error}`);
        throw error;
    }
};

/**
 * Stops a running container with the given ID. If a stop command is provided, it will be executed in the container before stopping it.
 * @param id The ID of the container to stop.
 * @param stopCmd The command to execute in the container before stopping it. If not provided, the container will be stopped immediately.
 */
export const stopContainer = async (id: string, stopCmd?: string): Promise<void> => {
    try {
        console.log(`Checking if container ${id} is running...`);
        const isRunning = await executeCommand(`docker ps -q --filter "name=${id}"`);
        if (isRunning && stopCmd) {
            console.log(`Executing stop command in container ${id}: ${stopCmd}`);
            sendCommandToContainer(id, stopCmd);
        }

        console.log(`Stopping container ${id}...`);
        await executeCommand(`docker stop ${id}`);
        console.log(`Container ${id} stopped successfully.`);
    } catch (error) {
        console.error(`Failed to stop container ${id}: ${error}`);
        throw error;
    }
};

/**
 * Executes a shell command within a running Docker container.
 * Attaches to the container to run the specified command and inherit its I/O.
 * Logs the success or failure of the command execution based on the exit code.
 * If an error occurs during the process, logs the error message.
 *
 * @param id The ID of the container in which to execute the command.
 * @param command The shell command to execute inside the container.
 */
export const sendCommandToContainer = (id: string, command: string): void => {
    const dockerAttach = spawn('docker', ['exec', id, 'sh', '-c', command], { stdio: 'inherit' });

    dockerAttach.on('error', (error) => {
        console.error(`Failed to execute command in container ${id}: ${error.message}`);
    });

    dockerAttach.on('close', (code) => {
        if (code === 0) {
            console.log(`Command '${command}' executed successfully in container ${id}.`);
        } else {
            console.error(`Command execution failed in container ${id} with exit code ${code}.`);
        }
    });
};


/**
 * Attaches to a running Docker container and streams its output to the console.
 * It also logs any errors that occur during the attachment process.
 *
 * @param id The ID of the container to which to attach.
 */
export const attachToContainer = (id: string): void => {
    const attachStream = spawn('docker', ['attach', id]);

    attachStream.stdout.on('data', (data) => console.log(`[${id}] STDOUT: ${data}`));
    attachStream.stderr.on('data', (data) => console.error(`[${id}] STDERR: ${data}`));

    attachStream.on('close', (code) => {
        console.log(`[${id}] Attach stream closed with code: ${code}`);
    });

    attachStream.on('error', (error) => {
        console.error(`Error attaching to container ${id}: ${error}`);
    });
};

/**
 * Kills a running Docker container with the given ID.
 * Logs the process of killing the container and its success or failure.
 * If an error occurs during the process, logs the error message.
 * Throws an error if the kill process fails.
 *
 * @param id The ID of the container to kill.
 * @throws Will throw an error if the command to kill the container fails.
 */
export const killContainer = async (id: string): Promise<void> => {
    try {
        console.log(`Killing container ${id}...`);
        await executeCommand(`docker rm -f ${id}`);
        console.log(`Container ${id} successfully killed.`);
    } catch (error) {
        console.error(`Failed to kill container ${id}: ${error}`);
        throw error;
    }
};