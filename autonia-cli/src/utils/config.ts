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
  supabaseUrl: "https://xqvmmvdmsibkchcvyocp.supabase.co", // Will be configured during setup
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxdm1tdmRtc2lia2NoY3Z5b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjY5MjQsImV4cCI6MjA3NTI0MjkyNH0.zelGdDqRoSaCldhk4wFd53g0pQ5DtwkskCzdqVf_C_I",
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
