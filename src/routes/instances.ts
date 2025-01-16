import { Router, Request, Response } from 'express';
import {
    attachToContainer,
    killContainer,
    sendCommandToContainer,
    startContainer,
    stopContainer,
    deleteContainerAndVolume
} from '../handlers/instanceHandlers';
import fs from 'fs/promises';

const router = Router();


router.post('/container/start', async (req: Request, res: Response) => {
    const { id, image, ports, env, Memory, Cpu } = req.body;

    console.log(env);

    if (!id || !image) {
        res.status(400).json({ error: 'Container ID and Image are required.' });
        return;
    }

    try {
        await startContainer(id, image, env, ports, Memory, Cpu);
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
