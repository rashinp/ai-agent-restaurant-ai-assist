import { Command } from "commander";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import express from "express";
import { createServer } from "http";
import { getSupabaseClient, saveToken, getTokenData, clearToken } from "../utils/auth.js";
import { AUTONIA_DEFAULTS } from "../utils/config.js";

export const loginCommand = new Command("login")
  .description("Authenticate with Autonia (opens browser)")
  .option("--no-browser", "Don't open browser automatically")
  .action(async (options) => {
    console.log(chalk.cyan("🔐 Autonia Login\n"));

    const PORT = 54321; // Local callback server port
    const REDIRECT_URL = `http://localhost:${PORT}/callback`;
    const brokerUrl = AUTONIA_DEFAULTS.brokerUrl;
    const loginUrl = `${brokerUrl}/auth/login?redirect=${encodeURIComponent(REDIRECT_URL)}`;

    // Create local server to receive callback
    const app = express();
    let server: any;

    const waitForCallback = new Promise<{ accessToken: string; refreshToken: string; user: any }>((resolve, reject) => {
      // Callback endpoint
      app.get("/callback", async (req, res) => {
        const { access_token, refresh_token, error, error_description } = req.query;

        if (error) {
          res.send(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #ef4444;">❌ Authentication Failed</h1>
                <p style="color: #6b7280;">${error_description || error}</p>
                <p style="margin-top: 20px; color: #6b7280;">You can close this window.</p>
              </body>
            </html>
          `);
          reject(new Error((error_description as string) || (error as string)));
          return;
        }

        if (!access_token || !refresh_token) {
          res.send(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #ef4444;">❌ No Token Received</h1>
                <p style="color: #6b7280;">Please try again.</p>
                <p style="margin-top: 20px; color: #6b7280;">You can close this window.</p>
              </body>
            </html>
          `);
          reject(new Error("No token received"));
          return;
        }

        try {
          // Get user info
          const supabase = getSupabaseClient();
          const { data: userData, error: userError } = await supabase.auth.getUser(access_token as string);

          if (userError || !userData.user) {
            throw userError || new Error("Failed to get user data");
          }

          res.send(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #10b981;">✅ Authentication Successful!</h1>
                <p style="color: #6b7280; font-size: 18px;">Logged in as: <strong>${userData.user.email}</strong></p>
                <p style="margin-top: 20px; color: #6b7280;">You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `);

          resolve({
            accessToken: access_token as string,
            refreshToken: refresh_token as string,
            user: userData.user,
          });
        } catch (err: any) {
          res.send(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #ef4444;">❌ Error</h1>
                <p style="color: #6b7280;">${err.message}</p>
                <p style="margin-top: 20px; color: #6b7280;">You can close this window.</p>
              </body>
            </html>
          `);
          reject(err);
        }
      });

      // Start server
      server = createServer(app);
      server.listen(PORT, () => {
        console.log(chalk.gray(`Local callback server started on port ${PORT}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        reject(new Error("Authentication timeout - please try again"));
      }, 5 * 60 * 1000);
    });

    try {
      console.log(chalk.blue("Opening browser for authentication...\n"));
      console.log(chalk.gray("If browser doesn't open, visit this URL:"));
      console.log(chalk.white(loginUrl));
      console.log();

      // Open browser
      if (options.browser !== false) {
        await open(loginUrl);
      }

      console.log(chalk.gray("Waiting for authentication...\n"));

      // Wait for callback
      const { accessToken, refreshToken, user } = await waitForCallback;

      // Close server
      if (server) {
        server.close();
      }

      // Save tokens
      saveToken(accessToken, refreshToken, user);

      console.log(chalk.green("✅ Successfully authenticated"));
      console.log();
      console.log(chalk.gray("Logged in as:"), chalk.white(user.email));
      console.log();
      console.log(chalk.blue("You can now deploy Agents with:"), chalk.white("autonia deploy"));

      process.exit(0);
    } catch (error: any) {
      // Close server on error
      if (server) {
        server.close();
      }

      console.log();
      console.error(chalk.red("❌ Authentication failed"));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

export const logoutCommand = new Command("logout").description("Log out from Autonia").action(async () => {
  const tokenData = getTokenData();

  if (!tokenData) {
    console.log(chalk.yellow("⚠️  You are not logged in"));
    return;
  }

  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `Log out from ${tokenData.user.email}?`,
    initial: true,
  });

  if (!confirm) {
    console.log(chalk.blue("ℹ️  Cancelled"));
    return;
  }

  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    // Ignore sign out errors
  }

  clearToken();
  console.log(chalk.green("✅ Successfully logged out"));
});

export const whoamiCommand = new Command("whoami").description("Show current authenticated user").action(async () => {
  const tokenData = getTokenData();

  if (!tokenData) {
    console.log(chalk.yellow("⚠️  Not authenticated"));
    console.log();
    console.log(chalk.gray("Run"), chalk.white("autonia login"), chalk.gray("to authenticate"));
    return;
  }

  console.log(chalk.cyan("👤 Authenticated User\n"));
  console.log(chalk.gray("Email:"), chalk.white(tokenData.user.email));
  console.log(chalk.gray("User ID:"), chalk.gray(tokenData.user.id));
  console.log(chalk.gray("Logged in:"), chalk.gray(new Date(tokenData.savedAt).toLocaleString()));
});
