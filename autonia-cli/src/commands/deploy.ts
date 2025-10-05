import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { buildProject, createDeploymentZip, uploadTobroker, pollDeploymentStatus } from "../utils/deployment.js";
import { loadConfig, AUTONIA_DEFAULTS } from "../utils/config.js";

export const deployCommand = new Command("deploy")
  .description("Build and deploy your Autonia application")
  .option("-s, --service <name>", "Override service name from config")
  .option("-t, --token <token>", "Bearer token for authentication")
  .option("--skip-build", "Skip build step (use existing dist/)", false)
  .option("-z, --zip <file>", "Use existing zip file instead of building")
  .action(async (options) => {
    console.log(chalk.cyan("🚀 Starting deployment process...\n"));

    // Load configuration
    const config = loadConfig();
    if (!config && !options.service) {
      console.error(chalk.red("❌ No autonia.config.json found and no --service provided."));
      console.log(chalk.yellow("💡 Run"), chalk.white("autonia init"), chalk.yellow("to create a configuration file."));
      process.exit(1);
    }

    // Use service name from config or option
    const serviceName = options.service || config?.serviceName;

    if (!serviceName) {
      console.error(chalk.red("❌ Service name is required."));
      console.log(chalk.yellow("💡 Run"), chalk.white("autonia init"), chalk.yellow("or use --service flag"));
      process.exit(1);
    }

    // Use embedded defaults
    const region = AUTONIA_DEFAULTS.region;
    const brokerUrl = AUTONIA_DEFAULTS.brokerUrl;
    const repo = AUTONIA_DEFAULTS.repo;
    const allowUnauthenticated = AUTONIA_DEFAULTS.allowUnauthenticated;
    const token = options.token;

    console.log(chalk.gray("Deployment configuration:"));
    console.log(chalk.gray(`  Service: ${serviceName}`));
    console.log(chalk.gray(`  Region: ${region}`));
    console.log(chalk.gray(`  Broker: ${brokerUrl}`));
    console.log(chalk.gray(`  Public Access: ${allowUnauthenticated ? "Enabled" : "Disabled"}`));
    console.log();

    let zipFile = options.zip;
    let shouldCleanupZip = false; // Track if we created the zip (vs user-provided)

    // Use existing zip or create new one
    if (!zipFile) {
      shouldCleanupZip = true; // We'll create it, so we should clean it up
      // Build project
      if (!options.skipBuild) {
        const buildSpinner = ora("Building project...").start();
        try {
          await buildProject();
          buildSpinner.succeed(chalk.green("✅ Build completed"));
        } catch (error) {
          buildSpinner.fail(chalk.red("❌ Build failed"));
          console.error(error);
          process.exit(1);
        }
      } else {
        console.log(chalk.blue("⏭️  Skipping build (using existing dist/)"));
      }

      // Verify dist exists
      if (!existsSync(resolve(process.cwd(), "dist"))) {
        console.error(chalk.red("❌ dist/ directory not found. Build your project first."));
        process.exit(1);
      }

      // Create deployment zip
      const zipSpinner = ora("Creating deployment package...").start();
      try {
        zipFile = await createDeploymentZip(serviceName || "app");
        zipSpinner.succeed(chalk.green(`✅ Created ${zipFile}`));
      } catch (error) {
        zipSpinner.fail(chalk.red("❌ Failed to create deployment package"));
        console.error(error);
        process.exit(1);
      }
    } else {
      console.log(chalk.blue(`📦 Using existing zip: ${zipFile}`));
      if (!existsSync(zipFile)) {
        console.error(chalk.red(`❌ Zip file not found: ${zipFile}`));
        process.exit(1);
      }
    }

    // Upload to broker and poll for status
    const uploadSpinner = ora("Uploading to Autonia Broker...").start();
    try {
      uploadSpinner.text = "Uploading...";
      const deployResponse = await uploadTobroker({
        zipFile,
        serviceName: serviceName!,
        region,
        repo,
        brokerUrl,
        token,
        allowUnauthenticated,
      });

      uploadSpinner.succeed(chalk.green("✅ Upload complete"));

      if (!deployResponse.operationId) {
        throw new Error("No operation ID received from broker");
      }

      // Poll for deployment status
      const pollSpinner = ora("Deploying to Cloud Run...").start();
      let finalStatus: any;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max (5 sec intervals)

      while (attempts < maxAttempts) {
        try {
          const status = await pollDeploymentStatus(brokerUrl, deployResponse.operationId, serviceName!, region, token);

          // Update spinner text based on status
          if (status.status === "WORKING" || status.status === "QUEUED") {
            pollSpinner.text = `Building... (${Math.floor((attempts * 5) / 60)}m ${(attempts * 5) % 60}s)`;
          } else if (status.status === "SUCCESS") {
            finalStatus = status;
            break;
          } else if (status.status === "FAILURE" || status.status === "TIMEOUT" || status.status === "CANCELLED") {
            finalStatus = status;
            break;
          }

          // Wait 5 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
        } catch (pollError: any) {
          // Continue polling even if status check fails
          pollSpinner.text = `Deploying... (${Math.floor((attempts * 5) / 60)}m ${(attempts * 5) % 60}s)`;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
        }
      }

      if (!finalStatus) {
        pollSpinner.fail(chalk.red("❌ Deployment timeout"));
        throw new Error("Deployment timed out after 10 minutes");
      }

      if (finalStatus.status !== "SUCCESS") {
        pollSpinner.fail(chalk.red("❌ Deployment failed"));
        throw new Error(finalStatus.error || "Deployment failed");
      }

      pollSpinner.succeed(chalk.green("✅ Deployment completed successfully!"));

      const response = finalStatus;

      // Clean up generated zip file
      if (shouldCleanupZip && zipFile) {
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(zipFile);
        } catch (err) {
          // Ignore cleanup errors
        }
      }

      // Display service URL prominently
      console.log();
      console.log(chalk.green.bold("🎉 Deployment Successful!"));
      console.log();

      if (response.url) {
        console.log(chalk.green.bold(response.url));
      } else {
        console.log(chalk.yellow("Service deployed (URL not available yet)"));
      }

      console.log();
      console.log(chalk.gray("View logs:"), chalk.white("autonia logs --follow"));
    } catch (error: any) {
      uploadSpinner.fail(chalk.red("❌ Deployment failed"));

      // Clean up generated zip file even on failure
      if (shouldCleanupZip && zipFile) {
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(zipFile);
        } catch (err) {
          // Ignore cleanup errors
        }
      }

      console.log();
      console.error(chalk.red("Error:"), error.message);

      // Try to parse error response if it's JSON
      if (error.response) {
        try {
          const errorData = typeof error.response === "string" ? JSON.parse(error.response) : error.response;
          if (errorData.error) {
            console.error(chalk.red("Details:"), errorData.error);
          }
          if (errorData.logUrl) {
            console.log();
            console.log(chalk.yellow("📋 Build logs:"), chalk.gray(errorData.logUrl));
          }
        } catch {
          console.error(chalk.gray("Response:"), error.response);
        }
      }

      console.log();
      console.log(chalk.yellow("💡 Tip:"), chalk.gray("Check the build logs above for details"));
      process.exit(1);
    }
  });
