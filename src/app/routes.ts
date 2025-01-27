import express from "express";
import path from "path";
import fs from "fs";



export function registerRoutes(app: express.Application): void {
    const routesDir = path.resolve(__dirname, "../routes");
    try {
        const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

        routeFiles.forEach(file => {
            const routerPath = path.join(routesDir, file);

            const router = require(routerPath).default;

            if (typeof router !== "function") {
                console.warn(`[WARN] Skipping ${file}: No valid router exported.`);
                return;
            }

            const routeBase = `/${file.replace(/\.(js|ts)$/, "")}`;
            app.use(routeBase, router);

            console.log(`[INFO] Router loaded: ${routeBase}`);
        });
    } catch (error) {
        console.error("[ERROR] Failed to load routes:", error);
        process.exit(1);
    }
}