#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { deployCommand } from "./commands/deploy.js";
import { logsCommand } from "./commands/logs.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/login.js";

const program = new Command();

program.name("autonia").description("CLI for deploying and managing Autonia Agents").version("0.2.0");

// Register commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(initCommand);
program.addCommand(deployCommand);
program.addCommand(logsCommand);

program.parse(process.argv);
