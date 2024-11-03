import { Router, Request, Response } from 'express';

const router = Router();
let config = process.env

router.get('/', async (req: Request, res: Response) => {
    try {
        const response = {
            versionFamily: 1,
            versionRelease: 'Airlink ' + config.version,
            status: 'Online',
            remote: config.remote,
        };
        res.json(response);
    } catch {
        res.status(500).send('Internal Server Error');
    }
});

export default router;