import { Router, Request, Response } from 'express';
import { meta } from '../../storage/config.json'
import config from '../utils/config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const response = {
            versionFamily: 1,
            versionRelease: 'Airlinkd ' + meta.version,
            status: 'Online',
            remote: config.remote,
        };
        res.json(response);
    } catch {
        res.status(500).send('Internal Server Error');
    }
});

export default router;