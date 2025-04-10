import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

interface Config {
    remote: string;
    key: string;
    port: number;
    DEBUG: boolean;
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
  remote: getEnvVar("remote", "localhost"),
  key: getEnvVar("key", "00000000000000000000000000000000"),
  port: parseInt(getEnvVar("port", "3002"), 10),
  DEBUG: false,
  environment: getEnvVar("environment", "development"),
  version: getEnvVar("version", "1.0.0"),
};

export default config;
