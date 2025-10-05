# Changelog

All notable changes to @autonia/cli will be documented in this file.

## [0.1.3] - 2025-10-05

### Changed

- **Polling Architecture**: Deployment now uses asynchronous polling instead of long HTTP waits
- CLI polls `/status/:operationId` endpoint every 5 seconds for deployment progress
- Upload completes immediately, then CLI polls for build status
- Shows elapsed time during deployment (e.g., "Building... (2m 30s)")
- More resilient to network issues and connection drops
- Broker can now handle multiple concurrent deployments efficiently

### Added

- New broker endpoint: `GET /status/:operationId` for checking deployment status
- `pollDeploymentStatus()` utility function in CLI
- Elapsed time display during deployment
- Maximum deployment timeout: 10 minutes (configurable)

### Removed

- Broker no longer waits for Cloud Build completion in `/deploy` endpoint
- No more long HTTP connections (3-6 minutes)

## [0.1.2] - 2025-10-05

### Added

- **Complete deployment waiting**: Broker now waits for Cloud Build to finish before responding
- **Service URL display**: CLI automatically shows the deployed service URL
- **Enhanced success output**: Beautiful formatted output with service URL prominently displayed
- **Build logs URL**: Direct link to Cloud Build logs for troubleshooting
- **Better error handling**: Failed deployments show detailed error messages and log URLs
- New documentation: `DEPLOYMENT-FLOW.md` explaining the complete deployment process

### Changed

- Broker now waits for `operation.promise()` to complete (adds 2-5 minutes to deployment)
- Broker fetches Cloud Run service URL using `@google-cloud/run` client
- CLI displays comprehensive success message with URL, region, and next steps
- Deployment spinner shows "Uploading..." while waiting for build completion
- Error messages now include build status and log URLs
- Deployment process is now synchronous - returns only when fully deployed

### Dependencies

- Added `@google-cloud/run@^1.3.0` to broker dependencies

## [0.1.1] - 2025-10-05

### Added

- Public access by default: Services now deployed with `--allow-unauthenticated` flag
- `allowUnauthenticated` parameter embedded in defaults (set to `true`)
- Public access status shown in deployment configuration output
- Broker now respects `allowUnauthenticated` parameter for dynamic access control
- New documentation: `PUBLIC-ACCESS.md` with security best practices

### Changed

- Updated broker to conditionally apply `--allow-unauthenticated` or `--no-allow-unauthenticated` based on parameter
- Deployment output now shows "Public Access: Enabled" status

## [0.1.0] - 2025-10-04

### Added

- Initial release of @autonia/cli
- Simplified configuration: only service name required in config file
- Embedded infrastructure defaults (project ID, region, broker URL, resources)
- `autonia init` command for project initialization
  - Interactive prompts for configuration
  - Displays embedded settings
  - Config validation
- `autonia deploy` command for deployment
  - Automatic build with pnpm
  - Smart zip packaging
  - Upload to Autonia Broker
  - Support for existing zip files
  - Skip build option
  - Authentication support
- `autonia logs` command for log viewing
  - Real-time log streaming with `--follow`
  - Configurable line count
  - Custom log filters
  - JSON log formatting
  - Severity-based color coding
- Configuration management via `autonia.config.json`
- Comprehensive CLI options for all commands
- Error handling and user-friendly messages
- Progress indicators with ora spinners
- Colored terminal output with chalk
