import express, { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let config = process.env

const app = express();

app.use(bodyParser.json());
app.use(basicAuth({
    users: { 'Airlink': config.key! },
    challenge: true,
}));

function loadRouters(): void {
    const routesDir = path.join(__dirname, 'routes');
    fs.readdir(routesDir, (err, files) => {
        if (err) return;

        files.forEach((file) => {
            if (file.endsWith('.js')) {
                try {
                    const routerPath = path.join(routesDir, file);
                    const router = require(routerPath);
                    const actualRouter = router.default || router;
                    
                    if (typeof actualRouter === 'function') {
                        app.use('/', actualRouter);
                    }
                } catch (error) {
                    console.error('Error loading router:', error);
                    process.exit(1);
                }
            }
        });
    });
}


loadRouters();

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send('Something has... gone wrong!');
});

const port = config.port;
setTimeout(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}, 1000);