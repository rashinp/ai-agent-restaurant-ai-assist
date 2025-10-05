import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { spawn } from "child_process";
import { loadConfig, AUTONIA_DEFAULTS } from "../utils/config.js";

export const logsCommand = new Command("logs")
  .description("Fetch logs for your deployed Autonia application")
  .option("-s, --service <name>", "Service name (default: from config)")
  .option("-f, --follow", "Stream logs in real-time", false)
  .option("-n, --lines <count>", "Number of recent log lines to fetch", "50")
  .option("--filter <filter>", "Custom log filter expression")
  .action(async (options) => {
    const config = loadConfig();

    const serviceName = options.service || config?.serviceName;
    const projectId = AUTONIA_DEFAULTS.projectId;

    if (!serviceName) {
      console.error(chalk.red("❌ Service name not found."));
      console.log(chalk.yellow("💡 Specify with --service or run"), chalk.white("autonia init"));
      process.exit(1);
    }

    // Check if gcloud CLI is installed
    const gcloudCheck = spawn("which", ["gcloud"], { shell: true });

    await new Promise((resolve) => {
      gcloudCheck.on("close", (code) => {
        if (code !== 0) {
          console.error(chalk.red("❌ gcloud CLI is not installed or not in PATH."));
          console.log(chalk.yellow("💡 Install it from: https://cloud.google.com/sdk/docs/install"));
          process.exit(1);
        }
        resolve(null);
      });
    });

    console.log(chalk.cyan(`📋 Fetching logs for service: ${serviceName}\n`));

    // Build gcloud command
    const args = ["logs"];

    if (options.follow) {
      args.push("tail", "--follow");
    } else {
      args.push("read");
      args.push(`--limit=${options.lines}`);
    }

    args.push(`--service=${serviceName}`);

    if (projectId) {
      args.push(`--project=${projectId}`);
    }

    if (options.filter) {
      args.push(`--filter=${options.filter}`);
    }

    // Add format for better readability
    args.push("--format=json");

    const spinner = ora("Loading logs...").start();

    // Execute gcloud logs command
    const logsProcess = spawn("gcloud", args, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let hasLogs = false;
    let buffer = "";

    logsProcess.stdout.on("data", (data) => {
      if (!hasLogs) {
        spinner.stop();
        hasLogs = true;
        if (!options.follow) {
          console.log(chalk.cyan("📋 Recent logs:\n"));
        }
      }

      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const log = JSON.parse(line);
            formatLogEntry(log);
          } catch {
            // If not JSON, just print the line
            console.log(line);
          }
        }
      }
    });

    logsProcess.stderr.on("data", (data) => {
      const error = data.toString();
      if (!error.includes("Listed 0 items")) {
        spinner.fail();
        console.error(chalk.red(error));
      }
    });

    logsProcess.on("close", (code) => {
      if (code === 0 && !hasLogs) {
        spinner.succeed(chalk.yellow("No logs found for this service."));
      } else if (code !== 0 && code !== null) {
        spinner.fail(chalk.red(`Logs command exited with code ${code}`));
        process.exit(code);
      } else {
        spinner.stop();
      }
    });

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      logsProcess.kill("SIGINT");
      console.log(chalk.yellow("\n\n👋 Stopped following logs."));
      process.exit(0);
    });
  });

function formatLogEntry(log: any) {
  const timestamp = log.timestamp || log.receiveTimestamp || "";
  const severity = log.severity || "INFO";
  const message = log.textPayload || log.jsonPayload?.message || JSON.stringify(log.jsonPayload || {});

  // Color code by severity
  let severityColor = chalk.gray;
  switch (severity) {
    case "ERROR":
      severityColor = chalk.red;
      break;
    case "WARNING":
      severityColor = chalk.yellow;
      break;
    case "INFO":
      severityColor = chalk.blue;
      break;
    case "DEBUG":
      severityColor = chalk.gray;
      break;
  }

  const timestampStr = timestamp ? chalk.gray(new Date(timestamp).toISOString()) : "";
  const severityStr = severityColor(`[${severity}]`.padEnd(10));

  console.log(`${timestampStr} ${severityStr} ${message}`);
}
