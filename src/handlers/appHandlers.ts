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

    const isDockerModemFix = async () => {
        // Dockerode Fix for Windows
        if (process.platform === 'win32') {
            const lockFilePath = path.join(__dirname, "..", '..', 'node_modules', 'docker-modem', 'lib', 'docker_modem_fix.lock');
            const modemPath = path.join(__dirname, "..", '..', 'node_modules', 'docker-modem', 'lib', 'modem.js');
            const modemUrl = 'https://raw.githubusercontent.com/achul123/docker-modem/refs/heads/master/lib/modem.js';
        
            if (!fs.existsSync(lockFilePath)) {
                console.log('Fixing docker-modem for windows...');
                // download the file and save in /node_modules/docker-modem/lib/modem.js
                const response = await fetch(modemUrl);
                const data = await response.text();
                await fs.promises.writeFile(modemPath, data, { encoding: 'utf8' });
            
                // Create the lock file to prevent future executions
                await fs.promises.writeFile(lockFilePath, 'Docker-modem fix applied', { encoding: 'utf8' });
                console.log('Docker-modem fix applied');
            }
        }
    }

    try {
        await isDockerInstalled();
        await isDockerRunning();
        await isDockerModemFix();
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