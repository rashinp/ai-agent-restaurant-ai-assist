# Update Summary: Public Access for Cloud Run Services

## Version 0.1.1 - Public Access by Default

### Problem

Deployed Cloud Run services were requiring authentication, making them inaccessible without proper credentials.

### Solution

Added `allowUnauthenticated: true` to the embedded defaults, ensuring all deployed services are publicly accessible by default.

## Changes Made

### 1. CLI Updates

#### `src/utils/config.ts`

- Added `allowUnauthenticated: true` to `AUTONIA_DEFAULTS`
- Services are now public by default

```typescript
export const AUTONIA_DEFAULTS = {
  // ... other settings
  allowUnauthenticated: true, // Make services public by default
} as const;
```

#### `src/utils/deployment.ts`

- Updated `UploadOptions` interface to include `allowUnauthenticated` parameter
- Modified `uploadTobroker` function to send this parameter to the broker

```typescript
export interface UploadOptions {
  // ... other fields
  allowUnauthenticated?: boolean;
}

// In uploadTobroker:
if (allowUnauthenticated !== undefined) {
  form.append("allowUnauthenticated", allowUnauthenticated.toString());
}
```

#### `src/commands/deploy.ts`

- Added `allowUnauthenticated` to deployment configuration
- Display public access status in deployment output
- Pass parameter to broker during upload

```typescript
const allowUnauthenticated = AUTONIA_DEFAULTS.allowUnauthenticated;

console.log(chalk.gray(`  Public Access: ${allowUnauthenticated ? "Enabled" : "Disabled"}`));

await uploadTobroker({
  // ... other params
  allowUnauthenticated,
});
```

### 2. Broker Updates

#### `autonia-broker/src/index.js`

- Accept `allowUnauthenticated` parameter from request body (defaults to "true")
- Parse parameter as boolean
- Conditionally apply `--allow-unauthenticated` or `--no-allow-unauthenticated` flag
- Include `publicAccess` status in response

```javascript
const {
  service = "my-service",
  region = "asia-south1",
  repo = "app-images",
  allowUnauthenticated = "true" // Default to public access
} = req.body;

const isPublic = allowUnauthenticated === "true" || allowUnauthenticated === true;

// In gcloud run deploy args:
...(isPublic ? ["--allow-unauthenticated"] : ["--no-allow-unauthenticated"]),

// In response:
res.json({
  message: "Build triggered",
  operation: operation.name,
  service,
  region,
  publicAccess: isPublic,
});
```

### 3. Documentation Updates

#### Updated Files:

- `README.md` - Added public access info to embedded defaults
- `CHANGELOG.md` - Documented v0.1.1 changes
- `PUBLIC-ACCESS.md` - NEW: Comprehensive security guide
- `package.json` - Bumped version to 0.1.1
- `src/index.ts` - Updated version to 0.1.1

## How It Works

### Deployment Flow

```
1. User runs: autonia deploy
   ↓
2. CLI reads: AUTONIA_DEFAULTS.allowUnauthenticated = true
   ↓
3. CLI sends to broker: allowUnauthenticated=true
   ↓
4. Broker parses: isPublic = true
   ↓
5. Broker adds flag: --allow-unauthenticated
   ↓
6. Cloud Run deploys: Service is publicly accessible ✅
```

## Deployment Output

### Before (Old)

```
Deployment configuration:
  Service: my-app
  Region: asia-south1
  Broker: https://broker-service...
```

### After (New)

```
Deployment configuration:
  Service: my-app
  Region: asia-south1
  Broker: https://broker-service...
  Public Access: Enabled  ← NEW!
```

### Response

```json
{
  "message": "Build triggered",
  "operation": "...",
  "service": "my-app",
  "region": "asia-south1",
  "publicAccess": true  ← NEW!
}
```

## Testing

### Verify Public Access

After deployment, test your service:

```bash
# Deploy your service
autonia deploy

# Get the service URL from Cloud Run console or:
gcloud run services describe YOUR_SERVICE \
  --region asia-south1 \
  --format='value(status.url)'

# Test access (should work without authentication)
curl https://your-service-url.run.app
```

### Check in Cloud Run Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click your service
3. Go to "Security" tab
4. Verify: ✅ "Allow unauthenticated invocations" is checked

## Security Considerations

⚠️ **Important**: Services are now public by default!

### Best Practices

1. **Implement App-Level Auth**: Add JWT, OAuth, or API keys in your application code
2. **Rate Limiting**: Protect against abuse
3. **Input Validation**: Always validate and sanitize inputs
4. **Monitor Logs**: Use `autonia logs --follow` to watch for suspicious activity
5. **Environment Variables**: Keep secrets in `.env` (never commit)

See `PUBLIC-ACCESS.md` for detailed security guidance.

## Rollback (If Needed)

### Make Service Private Again

If you need to disable public access for an existing service:

```bash
gcloud run services update YOUR_SERVICE_NAME \
  --region asia-south1 \
  --no-allow-unauthenticated
```

### Change Default Behavior

To make all future deployments private by default:

1. Edit `autonia-cli/src/utils/config.ts`:

   ```typescript
   allowUnauthenticated: false, // Make services private
   ```

2. Rebuild CLI:
   ```bash
   cd autonia-cli
   npm run build
   npm link
   ```

## Files Changed

### CLI

- ✅ `src/utils/config.ts` - Added default setting
- ✅ `src/utils/deployment.ts` - Added parameter support
- ✅ `src/commands/deploy.ts` - Display and pass parameter
- ✅ `src/index.ts` - Version bump
- ✅ `package.json` - Version bump
- ✅ `README.md` - Documentation update
- ✅ `CHANGELOG.md` - Version history
- ✅ `PUBLIC-ACCESS.md` - NEW security guide
- ✅ `UPDATE-SUMMARY.md` - This file

### Broker

- ✅ `autonia-broker/src/index.js` - Accept and apply parameter

## Next Steps

1. **Rebuild CLI**:

   ```bash
   cd autonia-cli
   npm run build
   npm link
   ```

2. **Redeploy Your App**:

   ```bash
   cd your-app
   autonia deploy
   ```

3. **Verify Access**:

   - Visit your Cloud Run service URL
   - Should be accessible without authentication ✅

4. **Add Security**:
   - Implement application-level authentication
   - Review `PUBLIC-ACCESS.md` for best practices

## Support

For questions about:

- **Security**: See `PUBLIC-ACCESS.md`
- **CLI Usage**: See `README.md` or `QUICKSTART.md`
- **Troubleshooting**: Run `autonia <command> --help`

## Summary

✅ Services now deploy as **public by default**  
✅ No authentication required to access deployed apps  
✅ Deployment output shows access status  
✅ Broker response confirms public access  
✅ Comprehensive security documentation provided  
⚠️ **Remember**: Implement app-level security!
