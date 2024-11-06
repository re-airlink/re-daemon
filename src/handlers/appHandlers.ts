import { exec } from 'child_process';
import express from 'express';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Initializes the application by performing necessary checks for Docker.
 *
 * 
 * This function checks if Docker is installed and running on the system.
 * If Docker is not installed, it logs an error message and throws an error.
 * If Docker is not running, it logs an error message and throws an error.
 *
 * 
 * @throws Will throw an error if Docker is not installed or not running.
 */
export async function init() {
    const isDockerInstalled = async () => {
        const command = process.platform === 'win32' ? 'docker --version' : 'which docker';

        try {
            await execAsync(command);
        } catch (error) {
            console.error("Docker is not installed. Please install Docker and try again.");
            throw error;
        }
    };

    const isDockerRunning = async () => {
        const command = 'docker ps';

        try {
            await execAsync(command);
        } catch (error) {
            console.error("Docker is not running. Please start Docker and try again.");
            throw error;
        }
    };
    
    try {
        await isDockerInstalled();
        await isDockerRunning();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

/**
 * Loads all route files from the routes directory and adds them to the express app.
 * @param {express.Application} app The express app to add the routes to.
 */
export function loadRouters(app: express.Application): void {
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