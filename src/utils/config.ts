import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

interface Config {
    remote: string;
    key: string;
    port: number;
    environment: string;
    version: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || defaultValue!;
}

const config: Config = {
  remote: getEnvVar("REMOTE", "localhost"),
  key: getEnvVar("KEY", "00000000000000000000000000000000"),
  port: parseInt(getEnvVar("PORT", "3002"), 10),
  environment: getEnvVar("ENVIRONMENT", "development"),
  version: getEnvVar("VERSION", "1.0.0"),
};

export default config;
