import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export interface AutoniaConfig {
  serviceName: string;
}

// Embedded defaults - these are NOT stored in config
export const AUTONIA_DEFAULTS = {
  projectId: "protean-acrobat-458913-n8",
  region: "asia-south1",
  brokerUrl: "https://broker-service-95057172923.asia-south1.run.app",
  repo: "app-images",
  memory: "2Gi",
  cpu: "2",
  timeout: "300",
  concurrency: 80,
  minInstances: 0,
  maxInstances: 10,
  port: 3000,
  allowUnauthenticated: true, // Make services public by default
} as const;

export function loadConfig(): AutoniaConfig | null {
  const configPath = resolve(process.cwd(), "autonia.config.json");

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = readFileSync(configPath, "utf-8");
    return JSON.parse(configContent);
  } catch (error) {
    console.error("Failed to parse autonia.config.json:", error);
    return null;
  }
}
