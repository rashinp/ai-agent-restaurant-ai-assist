# Usage Examples

## Quick Start

### 1. Initialize a new project

```bash
autonia init
```

This will prompt you for:
- GCP Project ID
- Region
- Broker URL
- Service name
- Optional advanced settings

Or provide values via flags:

```bash
autonia init \
  --project-id my-project \
  --region us-central1 \
  --broker-url https://broker.example.com \
  --service-name my-app
```

### 2. Deploy your application

```bash
autonia deploy
```

This will:
1. Install dependencies with `pnpm install`
2. Build your project with `pnpm run build`
3. Create a deployment package
4. Upload to your Autonia Broker
5. Trigger Cloud Run deployment

### 3. View logs

```bash
# View recent logs
autonia logs

# Stream logs in real-time
autonia logs --follow

# View last 100 logs
autonia logs --lines 100
```

## Common Workflows

### First Time Setup

```bash
# 1. Initialize project
cd my-autonia-app
autonia init

# 2. Deploy
autonia deploy

# 3. Check logs
autonia logs --follow
```

### Continuous Development

```bash
# Make changes to your code
# ...

# Deploy updates
autonia deploy

# Monitor logs
autonia logs --follow
```

### Production Deployment

```bash
# Deploy with authentication
autonia deploy --token $BROKER_TOKEN

# Use specific region
autonia deploy --region us-west1

# Deploy specific service
autonia deploy --service my-production-service
```

## Advanced Usage

### Deploying with Existing Builds

If you've already built your project:

```bash
autonia deploy --skip-build
```

### Using Pre-built Zip Files

```bash
# Create deployment package manually
# ...

# Deploy the zip
autonia deploy --zip my-app.zip
```

### Custom Log Filters

```bash
# Show only errors
autonia logs --filter "severity>=ERROR"

# Show logs from specific time
autonia logs --filter 'timestamp>="2025-10-01T00:00:00Z"'

# Combine filters
autonia logs --filter 'severity>=WARNING AND resource.type="cloud_run_revision"'
```

### Multiple Environments

Create different config files:

```bash
# autonia.config.dev.json
# autonia.config.staging.json
# autonia.config.prod.json

# Deploy to staging
cp autonia.config.staging.json autonia.config.json
autonia deploy

# Deploy to production
cp autonia.config.prod.json autonia.config.json
autonia deploy --token $PROD_TOKEN
```

## Configuration Examples

### Minimal Configuration

```json
{
  "projectId": "my-project",
  "region": "us-central1",
  "brokerUrl": "https://broker.run.app",
  "serviceName": "my-app"
}
```

### Full Configuration

```json
{
  "projectId": "my-project",
  "region": "us-central1",
  "brokerUrl": "https://broker.run.app",
  "serviceName": "my-app",
  "memory": "4Gi",
  "cpu": "4",
  "timeout": "600",
  "concurrency": 100,
  "minInstances": 1,
  "maxInstances": 20,
  "port": 8080
}
```

### High Traffic Configuration

```json
{
  "projectId": "my-project",
  "region": "us-central1",
  "brokerUrl": "https://broker.run.app",
  "serviceName": "high-traffic-app",
  "memory": "8Gi",
  "cpu": "8",
  "timeout": "300",
  "concurrency": 200,
  "minInstances": 3,
  "maxInstances": 100,
  "port": 3000
}
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
pnpm install
pnpm run build

# Then deploy
autonia deploy
```

### Authentication Issues

```bash
# For gcloud CLI
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# For broker authentication
autonia deploy --token YOUR_BROKER_TOKEN
```

### Connection Issues

```bash
# Test broker connectivity
curl -X GET https://your-broker-url.run.app/health

# Check logs
autonia logs --filter "severity>=ERROR"
```

## Tips & Best Practices

1. **Version Control**: Commit `autonia.config.json` to git for team collaboration
2. **Environment Variables**: Use `.env` files for secrets (never commit these!)
3. **Resource Allocation**: Start small and scale up based on monitoring
4. **Log Monitoring**: Use `--follow` during deploys to catch issues early
5. **Testing**: Test in dev/staging environments before production
6. **Rollbacks**: Keep previous zip files for quick rollbacks if needed

