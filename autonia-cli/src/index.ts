#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { deployCommand } from "./commands/deploy.js";
import { logsCommand } from "./commands/logs.js";

const program = new Command();

program.name("autonia").description("CLI tool for deploying and managing Autonia applications").version("0.1.4");

// Register commands
program.addCommand(initCommand);
program.addCommand(deployCommand);
program.addCommand(logsCommand);

program.parse(process.argv);
