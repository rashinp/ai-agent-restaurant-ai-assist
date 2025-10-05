import { execSync, spawn } from "child_process";
import { existsSync, createReadStream, createWriteStream, copyFileSync, mkdirSync, rmSync } from "fs";
import { resolve, join } from "path";
import archiver from "archiver";
import FormData from "form-data";
import fetch from "node-fetch";

export async function buildProject(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if pnpm is available
    try {
      execSync("pnpm --version", { stdio: "ignore" });
    } catch {
      // Try to enable pnpm via corepack
      try {
        execSync("corepack enable", { stdio: "ignore" });
        execSync("corepack prepare pnpm@latest --activate", { stdio: "ignore" });
      } catch (error) {
        reject(new Error("pnpm is not available and corepack failed to enable it"));
        return;
      }
    }

    // Install dependencies
    const installProcess = spawn("pnpm", ["install", "--frozen-lockfile"], {
      stdio: "inherit",
      shell: true,
    });

    installProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pnpm install failed with code ${code}`));
        return;
      }

      // Build project
      const buildProcess = spawn("pnpm", ["run", "build"], {
        stdio: "inherit",
        shell: true,
      });

      buildProcess.on("close", (buildCode) => {
        if (buildCode !== 0) {
          reject(new Error(`Build failed with code ${buildCode}`));
        } else {
          resolve();
        }
      });
    });
  });
}

export async function createDeploymentZip(serviceName: string): Promise<string> {
  const tmpDir = resolve(process.cwd(), ".deploy");
  const zipPath = resolve(process.cwd(), `${serviceName}.zip`);

  // Clean up temp directory if it exists
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true });
  }

  mkdirSync(tmpDir, { recursive: true });

  // Copy required files to temp directory
  const packageJsonPath = resolve(process.cwd(), "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }
  copyFileSync(packageJsonPath, join(tmpDir, "package.json"));

  // Copy pnpm-lock.yaml if exists
  const lockPath = resolve(process.cwd(), "pnpm-lock.yaml");
  if (existsSync(lockPath)) {
    copyFileSync(lockPath, join(tmpDir, "pnpm-lock.yaml"));
  }

  // Copy .env if exists
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    copyFileSync(envPath, join(tmpDir, ".env"));
  }

  // Copy dist directory
  const distPath = resolve(process.cwd(), "dist");
  if (!existsSync(distPath)) {
    throw new Error("dist/ directory not found");
  }

  // Use archiver to create zip
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // Clean up temp directory
      rmSync(tmpDir, { recursive: true });
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add files from temp directory
    archive.file(join(tmpDir, "package.json"), { name: "package.json" });

    if (existsSync(join(tmpDir, "pnpm-lock.yaml"))) {
      archive.file(join(tmpDir, "pnpm-lock.yaml"), { name: "pnpm-lock.yaml" });
    }

    if (existsSync(join(tmpDir, ".env"))) {
      archive.file(join(tmpDir, ".env"), { name: ".env" });
    }

    // Add dist directory
    archive.directory(distPath, "dist");

    archive.finalize();
  });

  return zipPath;
}

export interface UploadOptions {
  zipFile: string;
  serviceName: string;
  region: string;
  repo: string;
  brokerUrl: string;
  token?: string;
  allowUnauthenticated?: boolean;
}

export async function uploadTobroker(options: UploadOptions): Promise<any> {
  const { zipFile, serviceName, region, repo, brokerUrl, token, allowUnauthenticated } = options;

  const form = new FormData();
  form.append("source", createReadStream(zipFile));
  form.append("service", serviceName);
  form.append("region", region);
  form.append("repo", repo);

  // Add allow-unauthenticated flag for public access
  if (allowUnauthenticated !== undefined) {
    form.append("allowUnauthenticated", allowUnauthenticated.toString());
  }

  const headers: any = {
    ...form.getHeaders(),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${brokerUrl.replace(/\/$/, "")}/deploy`;

  const response = await fetch(url, {
    method: "POST",
    body: form,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    return await response.text();
  }
}

export async function pollDeploymentStatus(
  brokerUrl: string,
  operationId: string,
  serviceName: string,
  region: string,
  token?: string
): Promise<any> {
  const url = `${brokerUrl.replace(/\/$/, "")}/status/${encodeURIComponent(operationId)}?service=${serviceName}&region=${region}`;

  const headers: any = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Status check failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}
