import { Router, Request, Response } from 'express';
import afs from '../handlers/fs';

const router = Router();

router.get('/fs/list', async (req: Request, res: Response) => {
    const { id, path: relativePath = '/', filter } = req.body;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        const contents = await afs.list(id, relativePath as string, filter as string);
        res.json(contents);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

export default router;
