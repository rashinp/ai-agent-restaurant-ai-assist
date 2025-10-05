# Polling Architecture

## Overview

The broker now uses an **asynchronous polling architecture** instead of synchronous deployment waiting.

## Architecture

### Before (Synchronous)

```
Client → POST /deploy → [Wait 3-6 minutes] → Response with URL
```

**Problems:**

- Long HTTP connections (timeout risk)
- Broker can't handle concurrent deployments well
- No progress updates during deployment
- Connection issues cause failures

### After (Asynchronous + Polling)

```
Client → POST /deploy → Immediate response with operationId
   ↓
Client polls GET /status/:operationId every 5 seconds
   ↓
When status === SUCCESS → Client gets final response with URL
```

**Benefits:**

- ✅ No HTTP timeout issues
- ✅ Broker can handle many concurrent deployments
- ✅ Live progress updates (elapsed time)
- ✅ Resilient to connection issues
- ✅ Client can cancel/disconnect safely

## Endpoints

### POST /deploy

**Purpose**: Start a deployment

**Request**:

```
POST /deploy
Content-Type: multipart/form-data

- source: <zip file>
- service: "my-app"
- region: "asia-south1"
- repo: "app-images"
- allowUnauthenticated: "true"
```

**Response** (Immediate):

```json
{
  "message": "Deployment started",
  "operationId": "operations/build/PROJECT_ID/BUILD_ID",
  "service": "my-app",
  "region": "asia-south1",
  "publicAccess": true,
  "status": "BUILDING"
}
```

### GET /status/:operationId

**Purpose**: Check deployment status

**Request**:

```
GET /status/operations%2Fbuild%2FPROJECT_ID%2FBUILD_ID?service=my-app&region=asia-south1
```

**Query Parameters**:

- `service` - Service name (required for URL fetch)
- `region` - Region (required for URL fetch)

**Response** (In Progress):

```json
{
  "operationId": "operations/build/PROJECT_ID/BUILD_ID",
  "status": "WORKING",
  "logUrl": "https://console.cloud.google.com/cloud-build/builds/...",
  "service": "my-app",
  "region": "asia-south1",
  "message": "Deployment in progress"
}
```

**Response** (Success):

```json
{
  "operationId": "operations/build/PROJECT_ID/BUILD_ID",
  "status": "SUCCESS",
  "logUrl": "https://console.cloud.google.com/cloud-build/builds/...",
  "service": "my-app",
  "region": "asia-south1",
  "url": "https://my-app-xxxxx.run.app",
  "message": "Deployment successful"
}
```

**Response** (Failure):

```json
{
  "operationId": "operations/build/PROJECT_ID/BUILD_ID",
  "status": "FAILURE",
  "logUrl": "https://console.cloud.google.com/cloud-build/builds/...",
  "service": "my-app",
  "region": "asia-south1",
  "error": "Build failed",
  "message": "Deployment failed"
}
```

## Build Statuses

Cloud Build returns these statuses:

- `QUEUED` - Build is queued
- `WORKING` - Build is in progress
- `SUCCESS` - Build completed successfully ✅
- `FAILURE` - Build failed ❌
- `TIMEOUT` - Build timed out ❌
- `CANCELLED` - Build was cancelled ❌

## CLI Polling Implementation

The CLI:

1. **Uploads** the deployment package
2. **Receives** the operationId immediately
3. **Polls** `/status/:operationId` every 5 seconds
4. **Updates** spinner with elapsed time
5. **Breaks** when status is terminal (SUCCESS/FAILURE/etc)
6. **Displays** final result

### Polling Code

```typescript
// Upload and get operation ID
const deployResponse = await uploadTobroker({...});
const operationId = deployResponse.operationId;

// Poll for status
while (attempts < maxAttempts) {
  const status = await pollDeploymentStatus(
    brokerUrl,
    operationId,
    serviceName,
    region,
    token
  );

  if (status.status === "SUCCESS") {
    // Done! Show URL
    break;
  } else if (["FAILURE", "TIMEOUT", "CANCELLED"].includes(status.status)) {
    // Failed
    throw new Error(status.error);
  }

  // Wait 5 seconds before next poll
  await new Promise((resolve) => setTimeout(resolve, 5000));
  attempts++;
}
```

### CLI Output

```bash
$ autonia deploy

✅ Build completed
✅ Created my-app.zip
✅ Upload complete                    ← Fast response!

⠹ Deploying to Cloud Run... (0m 5s)   ← Polling started
⠹ Building... (0m 10s)
⠹ Building... (0m 15s)
...
⠹ Building... (2m 30s)
✅ Deployment completed successfully!  ← Done!

════════════════════════════════════
  🎉 Deployment Successful!
════════════════════════════════════

  🌐 Service URL:
     https://my-app-xxxxx.run.app
```

## Advantages

### For the Broker

✅ **Non-blocking**: Can handle multiple deployments simultaneously  
✅ **Simple**: Just trigger Cloud Build and return immediately  
✅ **Scalable**: No long-running HTTP connections  
✅ **Stateless**: No need to track deployment state

### For the CLI

✅ **Progress Updates**: Shows elapsed time during deployment  
✅ **Resilient**: Can reconnect if connection drops  
✅ **Cancelable**: User can Ctrl+C and check status later  
✅ **No Timeouts**: Polling intervals prevent HTTP timeouts

### For Users

✅ **Better UX**: See progress during long deployments  
✅ **Reliable**: Less likely to fail due to timeouts  
✅ **Transparent**: Clear indication of what's happening  
✅ **Predictable**: Consistent behavior regardless of deployment time

## Configuration

### Polling Interval

Default: **5 seconds**

```typescript
await new Promise((resolve) => setTimeout(resolve, 5000));
```

Adjust as needed:

- Faster polling = More responsive, more API calls
- Slower polling = Fewer API calls, less responsive

### Max Attempts

Default: **120 attempts** (10 minutes at 5s intervals)

```typescript
const maxAttempts = 120;
```

For longer deployments, increase this value.

## Error Handling

### Temporary Errors

If a status check fails temporarily (network issue), the CLI continues polling:

```typescript
catch (pollError: any) {
  // Continue polling even if status check fails
  pollSpinner.text = `Deploying... (${elapsed}s)`;
  await new Promise((resolve) => setTimeout(resolve, 5000));
  attempts++;
}
```

### Terminal Errors

If deployment fails, the broker returns a terminal status:

- `FAILURE` - Build failed
- `TIMEOUT` - Build timed out
- `CANCELLED` - Build was cancelled

The CLI detects these and stops polling immediately.

## Testing

### Test the Status Endpoint

```bash
# Start a deployment
curl -X POST https://broker.run.app/deploy \
  -F "source=@my-app.zip" \
  -F "service=my-app"

# Response:
# {"operationId": "operations/build/PROJECT/12345", ...}

# Check status
curl "https://broker.run.app/status/operations%2Fbuild%2FPROJECT%2F12345?service=my-app&region=asia-south1"

# Response:
# {"status": "WORKING", ...}
```

### Test Polling with CLI

```bash
autonia deploy

# Watch the polling in action:
# ⠹ Building... (0m 5s)
# ⠹ Building... (0m 10s)
# ...
```

## Migration from Synchronous

No changes needed! The CLI automatically uses the new polling system.

The broker change is backward compatible - it just returns faster now.

## Summary

🚀 **Async deployment** - Broker returns immediately  
📊 **Status polling** - CLI checks status every 5 seconds  
⏱️ **Progress updates** - Shows elapsed time  
✅ **Reliable** - No timeout issues  
🎯 **Scalable** - Handles concurrent deployments

The polling architecture provides a much better deployment experience! 🎉
