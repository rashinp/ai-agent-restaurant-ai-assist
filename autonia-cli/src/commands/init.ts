import { Command } from "commander";
import prompts from "prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { AUTONIA_DEFAULTS } from "../utils/config.js";

interface AutoniaConfig {
  serviceName: string;
}

export const initCommand = new Command("init")
  .description("Initialize a new Autonia project configuration")
  .option("-s, --service-name <name>", "Service name")
  .option("-f, --force", "Overwrite existing config", false)
  .action(async (options) => {
    const configPath = resolve(process.cwd(), "autonia.config.json");

    // Check if config already exists
    if (existsSync(configPath) && !options.force) {
      console.log(chalk.yellow("⚠️  autonia.config.json already exists!"));
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: "Do you want to overwrite it?",
        initial: false,
      });

      if (!overwrite) {
        console.log(chalk.blue("ℹ️  Initialization cancelled."));
        return;
      }
    }

    console.log(chalk.cyan("🚀 Initializing Autonia project...\n"));

    // Show embedded defaults
    console.log(chalk.gray("Using embedded configuration:"));
    console.log(chalk.gray(`  Project ID: ${AUTONIA_DEFAULTS.projectId}`));
    console.log(chalk.gray(`  Region: ${AUTONIA_DEFAULTS.region}`));
    console.log(chalk.gray(`  Broker URL: ${AUTONIA_DEFAULTS.brokerUrl}`));
    console.log(chalk.gray(`  Memory: ${AUTONIA_DEFAULTS.memory}, CPU: ${AUTONIA_DEFAULTS.cpu}`));
    console.log();

    // Only ask for service name
    let serviceName = options.serviceName;

    if (!serviceName) {
      const answer = await prompts({
        type: "text" as const,
        name: "serviceName",
        message: "Service name:",
        initial: process.cwd().split("/").pop(),
        validate: (value: string) => value.length > 0 || "Service name is required",
      });
      serviceName = answer.serviceName;
    }

    if (!serviceName) {
      console.log(chalk.red("❌ Service name is required"));
      process.exit(1);
    }

    const config: AutoniaConfig = {
      serviceName,
    };

    // Write config file
    try {
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
      console.log(chalk.green("\n✅ Configuration saved to autonia.config.json"));
      console.log(chalk.blue("\nConfiguration:"));
      console.log(chalk.gray(`  Service: ${serviceName}`));
      console.log(chalk.blue("\nNext steps:"));
      console.log(chalk.gray("  1. Run"), chalk.white("autonia deploy"), chalk.gray("to deploy your application"));
      console.log(chalk.gray("  2. Use"), chalk.white("autonia logs --follow"), chalk.gray("to monitor logs"));
    } catch (error) {
      console.error(chalk.red("❌ Failed to write config:"), error);
      process.exit(1);
    }
  });
