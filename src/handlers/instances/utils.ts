import Docker from "dockerode";
import fs from "fs";
import path from "path";
import afs from "../filesystem/fs";

export const docker = new Docker({ socketPath: process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock" });

const parseJavaCommand = (env: Record<string, string>): string => {
    const startCommand = env['START'] || '';
    // Todo : only for java21
    if (process.platform === 'darwin') {
        // Add UseSVE=0 for macOS/Darwin
        return startCommand.replace(
            /^(java\s+)/,
            '$1-XX:UseSVE=0 '
        );
    }
    return startCommand;
};

export const parseEnvironmentVariables = (env: Record<string, string>): Record<string, string> => {
    const newEnv = { ...env };
    if (process.platform === 'darwin' && newEnv['START']) {
        newEnv['START'] = parseJavaCommand(env);
    }
    return newEnv;
};

export const parsePortBindings = (ports: string): Record<string, Array<{ HostPort: string }>> => {
    const result: Record<string, Array<{ HostPort: string }>> = {};
    const mappings = ports.split(',');

    mappings.forEach((mapping) => {
        const [hostPort, containerPort] = mapping.split(':');

        if (hostPort && containerPort && !isNaN(Number(hostPort)) && !isNaN(Number(containerPort))) {
            result[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
        } else {
            console.warn(`Invalid port mapping: ${mapping}`);
        }
    });

    return result;
};

export const checkDirectoryExistence = (dir: string): boolean => {
    return fs.existsSync(dir);
};

export const initContainer = (id: string): string => {
    // 1st suspect __dirname
    const directoryPath = path.join(__dirname, '../../../volumes');

    if (!checkDirectoryExistence(directoryPath)) {
        try {
            fs.mkdirSync(directoryPath, { recursive: true });
            console.log(`Directory created: ${directoryPath}`);
        } catch (error) {
            console.error(`Error creating directory: ${error}`);
        }
    }

    const volumePath = path.join(directoryPath, id);

    if (!checkDirectoryExistence(volumePath)) {
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

export const getContainerStats = async (id: string) => {
    try {
        const container = docker.getContainer(id);
        const statsStream = await container.stats({ stream: false });

        const memoryUsage = statsStream.memory_stats.usage;
        const memoryLimit = statsStream.memory_stats.limit;
        const memoryPercentage = ((memoryUsage / memoryLimit) * 100).toFixed(2);

        const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage - statsStream.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta = statsStream.cpu_stats.system_cpu_usage - statsStream.precpu_stats.system_cpu_usage;
        const cpuUsage = ((cpuDelta / systemCpuDelta) * statsStream.cpu_stats.online_cpus * 100).toFixed(2);

        const storageStats = await container.inspect();
        const storageUsage = (await afs.getDirectorySizeHandler(id, "./") / (1024 * 1000)).toFixed(2);
        return {
            memory: {
                usage: memoryUsage,
                limit: memoryLimit,
                percentage: memoryPercentage,
            },
            cpu: {
                percentage: cpuUsage,
            },
            storage: {
                usage: storageUsage,
            },
        };
    } catch (error) {
        return null;
    }
};