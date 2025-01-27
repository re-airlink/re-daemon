import { docker, parsePortBindings, parseEnvironmentVariables, initContainer } from './utils';
import { deleteContainer } from './delete';

export const startContainer = async (
    id: string,
    image: string,
    env: Record<string, string> = {},
    ports: string = '',
    Memory: number,
    Cpu: number
): Promise<void> => {
    try {
        console.log(`Deleting existing container with ID: ${id} (if any)...`);
        await deleteContainer(id);

        const volumePath = initContainer(id);
        const portBindings = parsePortBindings(ports);
        const modifiedEnv = parseEnvironmentVariables(env);

        console.log(`Creating and starting container ${id}...`);
        await docker.createContainer({
            name: id,
            Image: image,
            Env: Object.entries(modifiedEnv).map(([key, value]) => `${key}=${value}`),
            HostConfig: {
                Binds: [`${volumePath}:/app/data`],
                PortBindings: portBindings,
                Memory: Memory * 1024 * 1024,
                CpuCount: Cpu,
                NetworkMode: 'host'
            },
            AttachStdout: true,
            AttachStderr: true,
            AttachStdin: true,
            OpenStdin: true,
            Tty: true,
        }).then((container) => container.start());
        
        console.log(`Container ${id} successfully started.`);
    } catch (error) {
        console.error(`Failed to start container ${id}: ${error}`);
    }
};