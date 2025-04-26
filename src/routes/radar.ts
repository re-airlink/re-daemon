import { Router, Request, Response } from 'express';
import { scanVolume } from '../handlers/radar/scan';
import logger from '../utils/logger';

const router = Router();

router.post('/radar/scan', async (req: Request, res: Response) => {
    const { id, script } = req.body;

    if (!id || !script) {
        res.status(400).json({ error: 'Container ID and script are required.' });
        return;
    }

    try {
        logger.info(`Received radar scan request for container ${id}`);
        const results = await scanVolume(id, script);
        res.status(200).json({
            success: true,
            message: `Scan completed for container ${id}`,
            results
        });
    } catch (error) {
        logger.error(`Error scanning container ${id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            success: false,
            error: `Failed to scan container: ${errorMessage}`
        });
    }
});

export default router;
