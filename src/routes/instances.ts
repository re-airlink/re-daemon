import { Router, Request, Response } from 'express';
import afs from '../handlers/filesystem/fs';

import { initContainer } from '../handlers/instances/utils';
import { attachToContainer } from '../handlers/instances/attach';
import { startContainer, createInstaller } from '../handlers/instances/create';
import { stopContainer } from '../handlers/instances/stop';
import { killContainer } from '../handlers/instances/kill';
import { deleteContainerAndVolume } from '../handlers/instances/delete';
import { sendCommandToContainer } from '../handlers/instances/command';
import { relative } from 'path';

const router = Router();

router.post('/container/installer', async (req: Request, res: Response) => {
    const { id, script, container, env } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }

    if (!script || !container) {
        res.status(400).json({ error: 'Script and Container are required.' });
        return;
    }

    let environmentVariables: Record<string, string> =
        typeof env === 'object' && env !== null ? { ...env } : {};

    try {
        await initContainer(id);

        await createInstaller(id, container, script, environmentVariables);

        res.status(200).json({ message: `Container ${id} installed successfully.` });
    } catch (error) {
        console.error(`Error installing container: ${error}`);
        res.status(500).json({ error: `Failed to install container ${id}.` });
    }
});

router.post('/container/install', async (req: Request, res: Response) => {
    const { id, scripts, env } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }

    let environmentVariables: Record<string, string> =
        typeof env === 'object' && env !== null ? { ...env } : {};

    try {
        await initContainer(id);

        if (scripts && Array.isArray(scripts)) {
            for (const script of scripts) {
                const { url, fileName } = script;

                if (!url || !fileName) {
                    console.warn(`Invalid script entry: ${JSON.stringify(script)}`);
                    continue;
                }

                // Replace ALVKT placeholders with environment variables
                const regex = /\$ALVKT\((\w+)\)/g;
                const resolvedUrl = url.replace(regex, (_: string, variableName: string) => {
                    if (environmentVariables[variableName]) {
                        return environmentVariables[variableName];
                    } else {
                        console.warn(`Variable "${variableName}" not found in environmentVariables.`);
                        return '';
                    }
                });

                if (!resolvedUrl) {
                    console.warn(`Failed to resolve URL for script: ${JSON.stringify(script)}`);
                    continue;
                }

                // Download the file using afs
                try {
                    if (script.ALVKT  === true) {
                        await afs.download(id, resolvedUrl, fileName, environmentVariables);
                    } else {
                        await afs.download(id, resolvedUrl, fileName);
                        }
                    console.log(`Downloaded ${fileName} from ${resolvedUrl} for container ${id}.`);
                } catch (error) {
                    console.error(`Error downloading file "${fileName}": ${error}`);
                    throw new Error(`Failed to download ${fileName}`);
                }
            }
        }
        const relativePath = "/airlink/installed.txt";
        console.log('test');

        afs.writeFileContentHandler(id, relativePath, "Installed: true")

        res.status(200).json({ message: `Container ${id} installed successfully.` });
    } catch (error) {
        console.error(`Error installing container: ${error}`);
        res.status(500).json({ error: `Failed to install container ${id}.` });
    }
});

router.post('/container/start', async (req: Request, res: Response) => {
    const { id, image, ports, env, Memory, Cpu, StartCommand } = req.body;

    if (!id || !image) {
        res.status(400).json({ error: 'Container ID and Image are required.' });
        return;
    }

    let environmentVariables: Record<string, string> =
        typeof env === 'object' && env !== null ? { ...env } : {};

        const regex = /\$ALVKT\((\w+)\)/g;
        let updatedStartCommand = StartCommand;
        updatedStartCommand = updatedStartCommand.replace(regex, (_: string, variableName: string) => {
            if (environmentVariables[variableName]) {
                return environmentVariables[variableName];
            } else {
                console.warn(`Variable "${variableName}" not found in environmentVariables.`);
                return '';
            }
        });
        
    if (updatedStartCommand) {
        environmentVariables['START'] = updatedStartCommand;
    }

    try {
        await startContainer(id, image, environmentVariables, ports, Memory, Cpu);
        res.status(200).json({ message: `Container ${id} started successfully.` });
    } catch (error) {
        console.error(`Error starting container: ${error}`);
        res.status(500).json({ error: `Failed to start container ${id}.` });
    }
});

router.post('/container/stop', async (req: Request, res: Response) => {
    const { id, stopCmd } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }

    try {
        await stopContainer(id, stopCmd);
        res.status(200).json({ message: `Container ${id} stopped successfully.` });
    } catch (error) {
        console.error(`Error stopping container: ${error}`);
        res.status(500).json({ error: `Failed to stop container ${id}.` });
    }
});

router.delete('/container/kill', async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }

    try {
        await killContainer(id);
        res.status(200).json({ message: `Container ${id} killed successfully.` });
    } catch (error) {
        console.error(`Error killing container: ${error}`);
        res.status(500).json({ error: `Failed to kill container ${id}.` });
    }
});

router.post('/container/attach', async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }

    try {
        attachToContainer(id);
        res.status(200).json({ message: `Attached to container ${id}.` });
    } catch (error) {
        console.error(`Error attaching to container: ${error}`);
        res.status(500).json({ error: `Failed to attach to container ${id}.` });
    }
});

router.post('/container/command', async (req: Request, res: Response) => {
    const { id, command } = req.body;

    if (!id || !command) {
        res.status(400).json({ error: 'Container ID and Command are required.' });
        return;
    }

    try {
        sendCommandToContainer(id, command);
        res.status(200).json({ message: `Command sent to container ${id}: ${command}` });
    } catch (error) {
        console.error(`Error sending command to container: ${error}`);
        res.status(500).json({ error: `Failed to send command to container ${id}.` });
    }
});

router.delete('/container/delete', async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
        res.status(400).json({ error: 'Container ID is required.' });
        return;
    }
    try {
        await deleteContainerAndVolume(id);
        res.status(200).json({ message: `Container ${id} deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting container: ${error}`);
        res.status(500).json({ error: `Failed to delete container ${id}.` });
    }
});

export default router;
