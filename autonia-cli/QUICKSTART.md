# @autonia/cli Quick Start Guide

## Installation

### Global Installation (Recommended)

```bash
npm install -g @autonia/cli
```

### Local Development

```bash
cd autonia-cli
./install-local.sh
```

## Basic Usage

### 1. Initialize Your Project

```bash
cd your-autonia-project
autonia init
```

This creates a simple `autonia.config.json`:

```json
{
  "serviceName": "my-app"
}
```

**All infrastructure settings are embedded in the CLI** - no need to configure:

- ✅ Project ID: `protean-acrobat-458913-n8`
- ✅ Region: `asia-south1`
- ✅ Broker URL: `https://broker-service-95057172923.asia-south1.run.app`
- ✅ Resources: 2Gi memory, 2 CPU, 80 concurrency

### 2. Deploy Your Application

```bash
autonia deploy
```

This will:

1. ✅ Install dependencies (`pnpm install`)
2. ✅ Build your project (`pnpm run build`)
3. ✅ Package app (package.json, pnpm-lock.yaml, .env, dist/)
4. ✅ Upload to broker
5. ✅ Deploy to Cloud Run

### 3. Monitor Logs

```bash
# View recent logs
autonia logs

# Stream logs in real-time
autonia logs --follow

# View more lines
autonia logs --lines 200
```

## Command Reference

### `autonia init`

Initialize project configuration - only asks for service name.

**Options:**

- `-s, --service-name <name>` - Service name
- `-f, --force` - Overwrite existing config

**Example:**

```bash
autonia init --service-name my-app
```

### `autonia deploy`

Deploy application to Cloud Run.

**Options:**

- `-s, --service <name>` - Override service name
- `-t, --token <token>` - Auth token
- `--skip-build` - Skip build step
- `-z, --zip <file>` - Use existing zip

**Examples:**

```bash
# Basic deploy
autonia deploy

# Deploy with auth
autonia deploy --token $BROKER_TOKEN

# Skip build (use existing dist/)
autonia deploy --skip-build

# Deploy different service
autonia deploy --service my-production-app
```

### `autonia logs`

View application logs.

**Options:**

- `-s, --service <name>` - Service name
- `-f, --follow` - Stream logs
- `-n, --lines <count>` - Number of lines (default: 50)
- `--filter <expr>` - Log filter

**Examples:**

```bash
# Recent logs
autonia logs

# Live stream
autonia logs --follow

# Errors only
autonia logs --filter "severity>=ERROR"
```

## Project Structure

Your Autonia project should have:

```
my-autonia-project/
├── autonia.config.json   # Created by: autonia init
├── package.json          # Required with "build" script
├── pnpm-lock.yaml        # If using pnpm
├── .env                  # Optional secrets
├── dist/                 # Build output
│   └── index.js
└── src/
    └── ...
```

### Requirements

- `package.json` must have a `build` script
- Build must output to `dist/` directory
- Node.js >= 18

## Complete Example

```bash
# Create new project
mkdir my-app && cd my-app
npm init -y

# Add your code
# ... create src/index.ts

# Add build script to package.json
# "build": "esbuild src/index.ts --bundle --outfile=dist/index.js"

# Initialize Autonia
autonia init
# ? Service name: my-app

# Deploy
autonia deploy

# Monitor
autonia logs --follow
```

## Key Differences from Old Approach

### Old Way (deploy.sh)

```bash
./deploy.sh \
  --url https://broker.run.app \
  --service my-app \
  --region asia-south1 \
  --repo app-images
```

### New Way (autonia CLI)

```bash
# One-time setup
autonia init

# Deploy anytime
autonia deploy
```

**Benefits:**

- ✅ No flags to remember
- ✅ Consistent configuration
- ✅ Reusable across projects
- ✅ Embedded infrastructure settings
- ✅ Built-in log viewing

## Embedded Configuration

The CLI embeds these settings so you don't have to configure them:

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
  port: 3000
}
```

**Why?** This ensures:

- Consistent deployments across all projects
- No configuration mistakes
- Faster setup time
- Standardized infrastructure

## Troubleshooting

### "pnpm not found"

CLI auto-enables pnpm via corepack:

```bash
corepack enable
```

### "dist/ not found"

Your build must output to `dist/`:

```json
{
  "scripts": {
    "build": "esbuild index.ts --bundle --outfile=dist/index.js"
  }
}
```

### "gcloud CLI not found" (for logs)

Install gcloud:

```bash
# macOS
brew install google-cloud-sdk

# Authenticate
gcloud auth login
gcloud config set project protean-acrobat-458913-n8
```

### Upload fails with 401

Use authentication token:

```bash
autonia deploy --token YOUR_BROKER_TOKEN
```

## Testing the CLI

Without installing globally:

```bash
cd autonia-cli

# Test version
node dist/index.js --version

# Test init
node dist/index.js init --service-name test-app

# Test help
node dist/index.js --help
```

## Next Steps

1. ✅ Install CLI: `npm install -g @autonia/cli`
2. ✅ Initialize: `autonia init`
3. ✅ Deploy: `autonia deploy`
4. ✅ Monitor: `autonia logs --follow`

For more examples, see [examples/USAGE.md](examples/USAGE.md)

## Development

To contribute or modify the CLI:

```bash
cd autonia-cli

# Install dependencies
npm install

# Make changes to src/

# Build
npm run build

# Test locally
node dist/index.js --help

# Install globally
npm link
```

## Support

- Check the [README.md](README.md)
- Review [examples/USAGE.md](examples/USAGE.md)
- Run `autonia <command> --help`
