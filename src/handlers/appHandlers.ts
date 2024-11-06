import { exec } from 'child_process';
import express from 'express';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function init() {
    async function checkDockerInstall() {
      const command = process.platform === 'win32' ? 'docker --version' : 'which docker';
  
      try {
        await execAsync(command);
        console.log("Docker is installed");
      } catch (error) {
        console.error("Docker isn't installed, install docker and try again");
        throw error;
      }
    }
  
    async function checkDockerLaunch() {
      const command = 'docker ps';
  
      try {
        await execAsync(command);
        console.log("Docker is running");
      } catch (error) {
        console.error("Docker isn't running, start docker and try again");
        throw error;
      }
    }
  
    try {
      await checkDockerInstall();
      await checkDockerLaunch();
    } catch (error) {
      console.error("Init error : ", error);
    }
}

export function loadRouters(app: express.Application): void {
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