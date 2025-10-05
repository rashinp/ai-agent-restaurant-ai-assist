# @autonia/cli

A streamlined command-line interface for deploying and managing Autonia applications on Google Cloud Run.

## Installation

### Global Installation

```bash
npm install -g @autonia/cli
```

### Local Development

```bash
cd autonia-cli
npm install
npm run build
npm link
```

## Features

- 🚀 **Simple Configuration** - Only service name required, all infrastructure settings embedded
- 📦 **Deploy** - Build, package, and deploy your application to Cloud Run
- 📋 **Logs** - View and stream application logs in real-time
- 🎯 **Opinionated** - Pre-configured defaults for seamless deployment

## Quick Start

### 1. Initialize Your Project

```bash
cd your-autonia-app
autonia init
```

This creates a minimal `autonia.config.json`:

```json
{
  "serviceName": "my-app"
}
```

All infrastructure settings are embedded in the CLI:

- **Project ID**: `protean-acrobat-458913-n8`
- **Region**: `asia-south1`
- **Broker URL**: `https://broker-service-95057172923.asia-south1.run.app`
- **Memory**: `2Gi`
- **CPU**: `2`
- **Concurrency**: `80`

### 2. Deploy Your Application

```bash
autonia deploy
```

### 3. View Logs

```bash
autonia logs --follow
```

## Commands

### `autonia init`

Initialize a new Autonia project.

**Usage:**

```bash
autonia init
autonia init --service-name my-app
autonia init --force  # Overwrite existing config
```

**Options:**

- `-s, --service-name <name>` - Service name
- `-f, --force` - Overwrite existing config

**What it does:**

- Creates `autonia.config.json` with your service name
- Shows embedded infrastructure configuration
- Validates service name

### `autonia deploy`

Build and deploy your application.

**Usage:**

```bash
autonia deploy
autonia deploy --service my-app
autonia deploy --skip-build
autonia deploy --zip app.zip
```

**Options:**

- `-s, --service <name>` - Override service name from config
- `-t, --token <token>` - Bearer token for authentication
- `--skip-build` - Skip build step (use existing dist/)
- `-z, --zip <file>` - Use existing zip file

**What it does:**

1. Runs `pnpm install --frozen-lockfile`
2. Runs `pnpm run build`
3. Creates deployment package (package.json, pnpm-lock.yaml, .env, dist/)
4. Uploads to Autonia Broker
5. Waits for Cloud Build to complete (2-5 minutes)
6. Displays service URL when ready
7. Cleans up generated zip file automatically

### `autonia logs`

View application logs.

**Usage:**

```bash
autonia logs
autonia logs --follow
autonia logs --lines 200
autonia logs --filter "severity>=ERROR"
```

**Options:**

- `-s, --service <name>` - Service name
- `-f, --follow` - Stream logs in real-time
- `-n, --lines <count>` - Number of recent log lines (default: 50)
- `--filter <filter>` - Custom log filter expression

**Examples:**

```bash
# View recent logs
autonia logs

# Stream logs in real-time
autonia logs --follow

# View last 100 logs
autonia logs --lines 100

# Show only errors
autonia logs --filter "severity>=ERROR"
```

## Configuration

### Config File: `autonia.config.json`

Minimal configuration - only service name required:

```json
{
  "serviceName": "my-app"
}
```

### Embedded Defaults

All infrastructure settings are embedded in the CLI:

```typescript
{
  projectId: 'protean-acrobat-458913-n8',
  region: 'asia-south1',
  brokerUrl: 'https://broker-service-95057172923.asia-south1.run.app',
  repo: 'app-images',
  memory: '2Gi',
  cpu: '2',
  timeout: '300',
  concurrency: 80,
  minInstances: 0,
  maxInstances: 10,
  port: 3000,
  allowUnauthenticated: true  // Services are public by default
}
```

These settings are consistent across all deployments and don't need to be configured per-project.

## Project Requirements

Your Autonia project must have:

1. **package.json** with a `build` script:

   ```json
   {
     "scripts": {
       "build": "esbuild index.ts --bundle --outfile=dist/index.js"
     }
   }
   ```

2. **dist/** directory (created by build):
   ```
   my-project/
   ├── autonia.config.json   # Created by: autonia init
   ├── package.json          # Required
   ├── pnpm-lock.yaml        # Recommended
   ├── .env                  # Optional (never commit!)
   ├── dist/                 # Created by build
   │   └── index.js
   └── src/
       └── ...
   ```

## Complete Workflow

```bash
# 1. Create your app
mkdir my-app && cd my-app
npm init -y

# 2. Add build script to package.json
# "build": "esbuild index.ts --bundle --outfile=dist/index.js"

# 3. Initialize Autonia
autonia init
# Enter service name: my-app

# 4. Deploy
autonia deploy
# ✅ Builds, packages, and deploys

# 5. Monitor
autonia logs --follow
# Watch your app logs in real-time
```

## How It Works

### Deployment Flow

```
autonia deploy
    ↓
pnpm install & build
    ↓
Create ZIP (package.json, dist/, .env)
    ↓
Upload to Autonia Broker
    ↓
Broker builds Docker image
    ↓
Push to Artifact Registry
    ↓
Deploy to Cloud Run
```

### Log Streaming

```
autonia logs --follow
    ↓
Connects to gcloud CLI
    ↓
Fetches from Cloud Run logs
    ↓
Formats & colors output
    ↓
Real-time stream to terminal
```

## Troubleshooting

### "pnpm not found"

The CLI automatically enables pnpm via corepack:

```bash
corepack enable
```

### "dist/ not found"

Ensure your build outputs to `dist/`:

```json
{
  "scripts": {
    "build": "esbuild index.ts --outfile=dist/index.js"
  }
}
```

### "gcloud CLI not found"

Required for `autonia logs`. Install:

```bash
# macOS
brew install google-cloud-sdk

# Or visit: https://cloud.google.com/sdk/docs/install
```

Then authenticate:

```bash
gcloud auth login
gcloud config set project protean-acrobat-458913-n8
```

### Upload Failures

If broker requires authentication:

```bash
autonia deploy --token YOUR_AUTH_TOKEN
```

## Advanced Usage

### Using Pre-built Artifacts

```bash
# Build separately
pnpm run build

# Deploy without rebuilding
autonia deploy --skip-build
```

### Deploying Pre-packaged Apps

```bash
# Use existing zip
autonia deploy --zip my-app.zip
```

### Multiple Services

Deploy different services from the same codebase:

```bash
autonia deploy --service my-app-staging
autonia deploy --service my-app-production
```

## Requirements

- **Node.js**: >= 18
- **pnpm**: Auto-enabled via corepack
- **gcloud CLI**: Required for logs command

## Architecture

```
autonia-cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/
│   │   ├── init.ts        # Project initialization
│   │   ├── deploy.ts      # Deployment logic
│   │   └── logs.ts        # Log streaming
│   └── utils/
│       ├── config.ts      # Config + embedded defaults
│       └── deployment.ts  # Build, zip, upload
├── dist/                  # Compiled JS
└── package.json
```

## Why This Approach?

**Simplified Configuration**: Only service name varies per project. All infrastructure settings are standardized and embedded in the CLI, reducing configuration complexity and ensuring consistency across all deployments.

**Opinionated Defaults**: Pre-configured for optimal performance on Cloud Run with sensible resource allocations.

**Zero Infrastructure Knowledge Required**: Developers can deploy without understanding GCP regions, broker URLs, or resource allocation.

## Support & Documentation

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md)
- **Examples**: See [examples/USAGE.md](examples/USAGE.md)
- **Changes**: See [CHANGELOG.md](CHANGELOG.md)

## License

MIT
