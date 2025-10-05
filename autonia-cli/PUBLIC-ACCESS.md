# Public Access Configuration

## Overview

By default, all services deployed via `@autonia/cli` are **publicly accessible** without requiring authentication. This means anyone can access your deployed Cloud Run service URL.

## Default Behavior

When you deploy with `autonia deploy`, the service is automatically configured with:

```
--allow-unauthenticated
```

This Cloud Run flag makes your service publicly accessible on the internet.

## How It Works

### 1. CLI Configuration

The CLI embeds `allowUnauthenticated: true` in its defaults:

```typescript
// src/utils/config.ts
export const AUTONIA_DEFAULTS = {
  // ... other settings
  allowUnauthenticated: true, // Make services public by default
} as const;
```

### 2. Broker Receives Parameter

When deploying, the CLI sends `allowUnauthenticated=true` to the broker:

```typescript
form.append("allowUnauthenticated", "true");
```

### 3. Broker Configures Cloud Run

The broker applies the appropriate flag during deployment:

```javascript
// If allowUnauthenticated is true:
--allow - unauthenticated;

// If allowUnauthenticated is false:
--no - allow - unauthenticated;
```

## Deployment Output

When you deploy, you'll see the access configuration:

```bash
$ autonia deploy

🚀 Starting deployment process...

Deployment configuration:
  Service: my-app
  Region: asia-south1
  Broker: https://broker-service-95057172923.asia-south1.run.app
  Public Access: Enabled  ← This confirms public access

✅ Build completed
✅ Created my-app.zip
✅ Upload successful

📋 Deployment Response:
{
  "message": "Build triggered",
  "operation": "...",
  "service": "my-app",
  "region": "asia-south1",
  "publicAccess": true  ← Confirmed in response
}
```

## Security Considerations

### ⚠️ Important

Since services are public by default, **anyone can access your deployed application**. Consider:

1. **Authentication**: Implement application-level authentication (e.g., JWT, OAuth)
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **API Keys**: Use API keys for programmatic access
4. **Environment Variables**: Keep secrets in `.env` (never commit to git)
5. **Input Validation**: Always validate and sanitize user inputs

### Example: Adding Authentication

```typescript
// In your app code
import express from "express";

const app = express();

// Add authentication middleware
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Your routes here
app.get("/api/data", (req, res) => {
  res.json({ data: "protected data" });
});
```

## Future: Private Services

If you need to make a service private (requires authentication), you would need to:

### Option 1: Modify CLI Defaults

Edit `autonia-cli/src/utils/config.ts`:

```typescript
export const AUTONIA_DEFAULTS = {
  // ... other settings
  allowUnauthenticated: false, // Make services private
} as const;
```

Then rebuild the CLI:

```bash
cd autonia-cli
npm run build
npm link
```

### Option 2: Add CLI Flag (Future Enhancement)

A future version could support:

```bash
autonia deploy --private  # Deploy as private service
autonia deploy --public   # Deploy as public service (default)
```

## Checking Current Access Status

### Via Google Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service
3. Go to "Security" tab
4. Check "Authentication" setting:
   - **"Allow unauthenticated invocations"** = Public ✅
   - **"Require authentication"** = Private 🔒

### Via gcloud CLI

```bash
gcloud run services describe YOUR_SERVICE_NAME \
  --region asia-south1 \
  --format='value(status.url,spec.template.metadata.annotations.run.googleapis.com/ingress)'
```

## Changing Access After Deployment

### Make Service Private

```bash
gcloud run services update YOUR_SERVICE_NAME \
  --region asia-south1 \
  --no-allow-unauthenticated
```

### Make Service Public

```bash
gcloud run services update YOUR_SERVICE_NAME \
  --region asia-south1 \
  --allow-unauthenticated
```

## Best Practices

✅ **DO:**

- Implement application-level authentication for sensitive data
- Use environment variables for secrets
- Add rate limiting
- Monitor access logs
- Validate all inputs

❌ **DON'T:**

- Expose sensitive data without authentication
- Store secrets in code
- Assume network-level security
- Skip input validation
- Ignore security headers

## Example: Production Setup

```typescript
// Production-ready app with security
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Authentication middleware
app.use("/api", (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Your protected routes
app.get("/api/data", (req, res) => {
  res.json({ data: "protected data" });
});

app.listen(3000);
```

## Summary

- 📢 **Services are PUBLIC by default** - accessible without authentication
- 🔒 **Application security is YOUR responsibility** - implement auth in your code
- 🛡️ **Use defense in depth** - multiple layers of security
- 📊 **Monitor access** - use Cloud Run logs to track usage
- 🔐 **Protect secrets** - use environment variables, never commit to git

For questions or concerns about security, review the [Cloud Run Security Best Practices](https://cloud.google.com/run/docs/securing/managing-access).
