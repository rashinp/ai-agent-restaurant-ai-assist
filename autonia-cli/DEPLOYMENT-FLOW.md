# Deployment Flow

## Overview

The `autonia deploy` command now waits for the complete deployment process to finish and displays the service URL when ready.

## Complete Deployment Process

```
┌─────────────────────────────────────┐
│ 1. Build Project                    │
│    • pnpm install --frozen-lockfile │
│    • pnpm run build                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Create Deployment Package        │
│    • Zip: package.json              │
│    •      pnpm-lock.yaml            │
│    •      .env                      │
│    •      dist/                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Upload to Broker                 │
│    • POST to /deploy endpoint       │
│    • Send allowUnauthenticated flag │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Broker Triggers Cloud Build      │
│    • Generate Dockerfile            │
│    • Build Docker image             │
│    • Push to Artifact Registry      │
│    • Deploy to Cloud Run            │
└──────────────┬──────────────────────┘
               │
               ▼ (WAITS FOR COMPLETION)
               │
┌─────────────────────────────────────┐
│ 5. Broker Waits for Build           │
│    • Monitors Cloud Build status    │
│    • operation.promise()            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Get Service URL                  │
│    • Query Cloud Run service        │
│    • Extract service.uri            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Return Complete Response         │
│    • Service URL                    │
│    • Public access status           │
│    • Build logs URL                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 8. CLI Displays Success             │
│    • Service URL (clickable)        │
│    • Build logs link                │
│    • Next steps                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 9. Cleanup                          │
│    • Delete generated zip file      │
│    • (Preserves user-provided zips) │
└─────────────────────────────────────┘
```

## User Experience

### What You'll See

```bash
$ autonia deploy

🚀 Starting deployment process...

Deployment configuration:
  Service: my-app
  Region: asia-south1
  Broker: https://broker-service-95057172923.asia-south1.run.app
  Public Access: Enabled

▶️  Installing deps & building…
✅ Build completed
✅ Created my-app.zip
⠋ Uploading...

# ← Waits here for Cloud Build to complete (2-5 minutes typically)

✅ Deployment completed successfully!

════════════════════════════════════════════════════════════
  🎉 Deployment Successful!
════════════════════════════════════════════════════════════

  Service: my-app
  Region: asia-south1

  🌐 Service URL:
     https://my-app-xxxxx-uc.a.run.app

  🔓 Public Access: Enabled

  📋 Build Logs:
     https://console.cloud.google.com/cloud-build/builds/...

════════════════════════════════════════════════════════════

💡 Next steps:
  • Test your service: curl https://my-app-xxxxx-uc.a.run.app
  • View logs: autonia logs --follow
```

## Key Changes

### Before (v0.1.0)

- Broker returned immediately after triggering Cloud Build
- User had to manually check Cloud Run console for URL
- No indication when deployment actually completed
- No way to know if deployment succeeded or failed

```json
{
  "message": "Build triggered",
  "operation": "operations/...",
  "service": "my-app",
  "region": "asia-south1"
}
```

### After (v0.1.1)

- Broker waits for Cloud Build to complete (2-5 minutes)
- Returns service URL automatically
- CLI shows prominent success message with URL
- Includes build logs for troubleshooting
- Clear indication of success/failure

```json
{
  "message": "Deployment successful",
  "operation": "operations/...",
  "service": "my-app",
  "region": "asia-south1",
  "publicAccess": true,
  "url": "https://my-app-xxxxx-uc.a.run.app",
  "status": "SUCCESS",
  "logUrl": "https://console.cloud.google.com/cloud-build/builds/..."
}
```

## Technical Details

### Broker Changes

#### 1. Wait for Cloud Build Completion

```javascript
// Old: Return immediately
const [operation] = await cloudBuildClient.createBuild({
  projectId: PROJECT_ID,
  build,
});

res.json({ message: "Build triggered", operation: operation.name });

// New: Wait for completion
const [operation] = await cloudBuildClient.createBuild({
  projectId: PROJECT_ID,
  build,
});

console.log("Waiting for build to complete...");
const [completedBuild] = await operation.promise(); // ← Waits here

if (completedBuild.status !== "SUCCESS") {
  return res.status(500).json({
    error: "Build failed",
    status: completedBuild.status,
    logUrl: completedBuild.logUrl,
  });
}
```

#### 2. Fetch Service URL

```javascript
const { CloudRunClient } = await import("@google-cloud/run");
const runClient = new CloudRunClient();

const servicePath = runClient.servicePath(PROJECT_ID, region, service);
const [serviceInfo] = await runClient.getService({ name: servicePath });

const serviceUrl = serviceInfo.uri;

res.json({
  message: "Deployment successful",
  url: serviceUrl,
  // ... other fields
});
```

### CLI Changes

#### Enhanced Output

```typescript
// Before: Simple JSON dump
console.log(JSON.stringify(response, null, 2));

// After: Beautiful formatted output
console.log(chalk.cyan("═".repeat(60)));
console.log(chalk.green.bold("  🎉 Deployment Successful!"));
console.log(chalk.cyan("═".repeat(60)));
console.log();
console.log(chalk.white("  🌐 Service URL:"));
console.log(chalk.green.bold(`     ${response.url}`));
```

#### Better Error Handling

```typescript
catch (error: any) {
  uploadSpinner.fail(chalk.red("❌ Deployment failed"));

  if (errorData.logUrl) {
    console.log(chalk.yellow("📋 Build logs:"), chalk.gray(errorData.logUrl));
  }

  console.log(chalk.yellow("💡 Tip:"), chalk.gray("Check the build logs"));
}
```

## Deployment Times

Typical deployment timeline:

- **Local Build**: 10-30 seconds
- **Upload**: 5-10 seconds
- **Cloud Build**: 2-5 minutes
  - Generate Dockerfile: 5 seconds
  - Build image: 1-3 minutes
  - Push to registry: 30-60 seconds
  - Deploy to Cloud Run: 30-60 seconds
- **Total**: ~3-6 minutes

## Error Handling

### Build Failure

If Cloud Build fails, you'll see:

```
❌ Deployment failed

Error: Upload failed (500): Build failed

Details: Build failed
Status: FAILURE

📋 Build logs:
   https://console.cloud.google.com/cloud-build/builds/...

💡 Tip: Check the build logs above for details
```

### Common Errors

1. **Missing Dependencies**

   - Error: `Cannot find module 'xxx'`
   - Fix: Add to `package.json` dependencies

2. **Build Script Fails**

   - Error: `Build failed with code 1`
   - Fix: Test `pnpm run build` locally

3. **Timeout**

   - Error: `Operation timeout`
   - Fix: Optimize build or increase timeout

4. **Permission Denied**
   - Error: `403 Forbidden`
   - Fix: Check GCP permissions for Cloud Run

## Benefits

✅ **Complete Visibility**: Know exactly when deployment finishes  
✅ **Immediate URL**: Get service URL right in terminal  
✅ **Error Detection**: Catch build failures immediately  
✅ **Better UX**: No manual checking in Cloud Console  
✅ **CI/CD Ready**: Can script deployments with confidence  
✅ **Build Logs**: Direct link when troubleshooting needed

## Usage Tips

### 1. Long Deployments

Deployments can take 3-6 minutes. The CLI will show a spinner:

```
⠋ Uploading...
```

**Don't interrupt this!** The broker is waiting for Cloud Build to complete.

### 2. Multiple Deployments

You can deploy multiple services simultaneously in different terminals:

```bash
# Terminal 1
cd app-1 && autonia deploy

# Terminal 2
cd app-2 && autonia deploy
```

Each will wait independently for its deployment.

### 3. CI/CD Integration

Perfect for CI/CD pipelines:

```bash
#!/bin/bash
set -e  # Exit on error

# Deploy will wait for completion
autonia deploy

# If we get here, deployment succeeded
echo "Deployment URL: $SERVICE_URL"
```

### 4. Troubleshooting

If deployment fails, click the build logs URL to see detailed error messages in Google Cloud Console.

## Configuration

No configuration needed! The waiting behavior is automatic.

However, you can:

- Monitor progress with verbose broker logs
- Set custom timeouts in Cloud Build (advanced)
- Use `--skip-build` to speed up re-deployments

## Summary

The deployment process now provides a **complete, synchronous workflow**:

1. ✅ Builds locally
2. ✅ Uploads to broker
3. ✅ **Waits for Cloud Build** ← NEW!
4. ✅ **Fetches service URL** ← NEW!
5. ✅ **Displays URL prominently** ← NEW!
6. ✅ Returns only when fully deployed

**Result**: You get the service URL immediately after `autonia deploy` completes! 🎉
