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
        try {
            const stream = await docker.pull(image);
            await new Promise((resolve, reject) => {
                docker.modem.followProgress(stream, (err, result) => {
                    if (err) {
                        return reject(new Error(`Failed to pull image: ${err.message}`));
                    }
                    console.log(`Image ${image} pulled successfully.`);
                    resolve(result);
                });
            });
        } catch (err) {
            console.error(`Error pulling image ${Image}:`, err);
            return;
        }

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