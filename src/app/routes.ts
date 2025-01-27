import express from "express";
import path from "path";
import fs from "fs";

export function registerRoutes(app: express.Application): void {

    const routesDir = path.join(__dirname, '../routes');
    const files = fs.readdirSync(routesDir);
  
    files
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            try {
                const routerPath = path.join(routesDir, file);
                const { default: router } = require(routerPath);
  
                if (typeof router === 'function') {
                    app.use('/', router);
                }
            } catch (error) {
                console.error('Error loading router:', error);
                process.exit(1);
            }
        });
  }
