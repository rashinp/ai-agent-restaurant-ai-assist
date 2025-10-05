import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import fetch from "node-fetch";
import { loadConfig, AUTONIA_DEFAULTS } from "../utils/config.js";

export const logsCommand = new Command("logs")
  .description("Fetch logs for your deployed Autonia application")
  .option("-s, --service <name>", "Service name (default: from config)")
  .option("-f, --follow", "Stream logs in real-time", false)
  .option("-n, --lines <count>", "Number of recent log lines to fetch", "50")
  .option("--filter <filter>", "Custom log filter expression")
  .option("-t, --token <token>", "Bearer token for authentication")
  .action(async (options) => {
    const config = loadConfig();

    const serviceName = options.service || config?.serviceName;
    const region = AUTONIA_DEFAULTS.region;
    const brokerUrl = AUTONIA_DEFAULTS.brokerUrl;

    if (!serviceName) {
      console.error(chalk.red("❌ Service name not found."));
      console.log(chalk.yellow("💡 Specify with --service or run"), chalk.white("autonia init"));
      process.exit(1);
    }

    console.log(chalk.cyan(`📋 Fetching logs for service: ${serviceName}\n`));

    // Build query parameters
    const params = new URLSearchParams({
      service: serviceName,
      region,
      lines: options.lines,
    });

    if (options.filter) {
      params.append("filter", options.filter);
    }

    if (options.follow) {
      params.append("follow", "true");
    }

    const url = `${brokerUrl.replace(/\/$/, "")}/logs?${params.toString()}`;
    const headers: any = {};

    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    try {
      if (options.follow) {
        // Handle Server-Sent Events for streaming
        const spinner = ora("Connecting to log stream...").start();
        const response = await fetch(url, { headers });

        if (!response.ok) {
          spinner.fail(chalk.red("❌ Failed to connect to log stream"));
          const error = await response.text();
          console.error(chalk.red(error));
          process.exit(1);
        }

        if (!response.body) {
          spinner.fail(chalk.red("❌ No response body"));
          process.exit(1);
        }

        spinner.succeed(chalk.green("✅ Connected to log stream"));
        console.log(chalk.cyan("📋 Streaming logs:\n"));

        let buffer = "";

        // node-fetch v3 uses Node.js streams
        const body = response.body as any;

        body.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "log") {
                  formatLogEntry(data.data);
                } else if (data.type === "connected") {
                  // Initial connection message
                }
              } catch (err) {
                // Ignore parsing errors
              }
            }
          }
        });

        body.on("error", (err: Error) => {
          console.error(chalk.red("❌ Stream error:"), err.message);
          process.exit(1);
        });

        body.on("end", () => {
          console.log(chalk.yellow("\n\n👋 Stream ended."));
          process.exit(0);
        });

        // Handle Ctrl+C gracefully
        process.on("SIGINT", () => {
          body.destroy();
          console.log(chalk.yellow("\n\n👋 Stopped following logs."));
          process.exit(0);
        });
      } else {
        // One-time fetch
        const spinner = ora("Loading logs...").start();
        const response = await fetch(url, { headers });

        if (!response.ok) {
          spinner.fail(chalk.red("❌ Failed to fetch logs"));
          const error = await response.text();
          console.error(chalk.red(error));
          process.exit(1);
        }

        const data: any = await response.json();
        spinner.stop();

        if (!data.logs || data.logs.length === 0) {
          console.log(chalk.yellow("No logs found for this service."));
          return;
        }

        console.log(chalk.cyan("📋 Recent logs:\n"));
        // Display in reverse order (oldest first)
        for (const log of data.logs.reverse()) {
          formatLogEntry(log);
        }
      }
    } catch (error: any) {
      console.error(chalk.red("❌ Error fetching logs:"), error.message);
      process.exit(1);
    }
  });

function formatLogEntry(log: any) {
  const timestamp = log.timestamp || "";
  const severity = log.severity || "INFO";

  // Handle different message formats from broker
  let message = "";
  if (typeof log.message === "string") {
    message = log.message;
  } else if (log.message?.textPayload) {
    message = log.message.textPayload;
  } else if (log.message?.jsonPayload) {
    message = JSON.stringify(log.message.jsonPayload);
  } else if (typeof log.message === "object") {
    message = JSON.stringify(log.message);
  }

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
