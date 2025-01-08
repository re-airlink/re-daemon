import { Router, Request, Response } from 'express';
import afs from '../handlers/fs';

const router = Router();

interface DirectoryItem {
    name: string;
    type: 'file' | 'directory';
    extension?: string;
    category?: string;
    size: number;
}

router.get('/fs/list', async (req: Request, res: Response) => {
    const { id, path: relativePath = '/', filter } = req.query;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        const contents = await afs.list(id as string, relativePath as string, filter as string);
        res.json(contents);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

router.get('/fs/size', async (req: Request, res: Response) => {
    const { id, path: relativePath = '/' } = req.query;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        const size = await afs.getDirectorySizeHandler(id as string, relativePath as string);
        res.json({ size });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

router.get('/fs/info', async (req: Request, res: Response) => {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        const relativePath = '/';
        const contents: DirectoryItem[] = await afs.list(id as string, relativePath);

        const totalSize = contents.reduce((accum: number, item: DirectoryItem) => accum + (item.size || 0), 0);

        const fileCount = contents.filter((item: DirectoryItem) => item.type === 'file').length;
        const dirCount = contents.filter((item: DirectoryItem) => item.type === 'directory').length;

        res.json({
            id: id,
            totalSize: totalSize,
            fileCount: fileCount,
            dirCount: dirCount
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

router.get('/fs/file/content', async (req: Request, res: Response) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const relativePath = typeof req.query.path === 'string' ? req.query.path : '/';

    if (!id) {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        const content = await afs.getFileContentHandler(id, relativePath);
        if (content === null) {
            res.status(404).json({ error: 'File content could not be read or is not a text file.' });
        } else {
            res.json({ content });
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

router.post('/fs/file/content', async (req: Request, res: Response) => {
    const id = typeof req.body.id === 'string' ? req.body.id : undefined;
    const relativePath = typeof req.body.path === 'string' ? req.body.path : '/';
    const content = typeof req.body.content === 'string' ? req.body.content : '';

    if (!id) {
        res.status(400).json({ error: 'Container ID is required and must be a string.' });
        return;
    }

    try {
        await afs.writeFileContentHandler(id, relativePath, content);
        res.json({ message: 'File content successfully saved.' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

export default router;
