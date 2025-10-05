# Migration Guide: Simplified Configuration

## What Changed?

The CLI has been simplified to only require **service name** in the configuration file. All infrastructure settings are now embedded in the CLI itself.

## Before (Old Config)

```json
{
  "projectId": "protean-acrobat-458913-n8",
  "region": "asia-south1",
  "brokerUrl": "https://broker-service-95057172923.asia-south1.run.app",
  "serviceName": "my-app",
  "memory": "2Gi",
  "cpu": "2",
  "timeout": "300",
  "concurrency": 80,
  "minInstances": 0,
  "maxInstances": 10,
  "port": 3000
}
```

## After (New Config)

```json
{
  "serviceName": "my-app"
}
```

## Why This Change?

1. **Simpler Setup**: Only one value to configure
2. **Consistency**: All deployments use same infrastructure settings
3. **Less Errors**: No misconfiguration possible
4. **Opinionated**: Standardized best practices

## Embedded Settings

These are now hardcoded in the CLI (`src/utils/config.ts`):

```typescript
export const AUTONIA_DEFAULTS = {
  projectId: "protean-acrobat-458913-n8",
  region: "asia-south1",
  brokerUrl: "https://broker-service-95057172923.asia-south1.run.app",
  repo: "app-images",
  memory: "2Gi",
  cpu: "2",
  timeout: "300",
  concurrency: 80,
  minInstances: 0,
  maxInstances: 10,
  port: 3000,
} as const;
```

## Migration Steps

### For Existing Projects

1. **Backup your old config** (optional):

   ```bash
   cp autonia.config.json autonia.config.json.backup
   ```

2. **Simplify your config**:

   ```bash
   echo '{"serviceName": "your-service-name"}' > autonia.config.json
   ```

   Or use the CLI:

   ```bash
   autonia init --force
   ```

3. **Deploy as usual**:
   ```bash
   autonia deploy
   ```

### For New Projects

Just run:

```bash
autonia init
```

## Command Changes

### `autonia init`

**Before:**

```bash
autonia init \
  --project-id my-project \
  --region us-central1 \
  --broker-url https://broker.run.app \
  --service-name my-app
```

**After:**

```bash
autonia init --service-name my-app
```

### `autonia deploy`

**Before:**

```bash
autonia deploy \
  --service my-app \
  --region asia-south1 \
  --broker-url https://broker.run.app
```

**After:**

```bash
autonia deploy
```

All settings are automatic! You can still override service name:

```bash
autonia deploy --service my-other-app
```

### `autonia logs`

No changes - works the same way:

```bash
autonia logs --follow
```

## Breaking Changes

⚠️ **Config File Format**: Old config files with all settings will still work, but only `serviceName` is used. All other fields are ignored.

⚠️ **Command Options Removed**:

- `--region` flag removed from deploy (uses embedded default)
- `--broker-url` flag removed from deploy (uses embedded default)
- `--project-id` flag removed from init (uses embedded default)

⚠️ **No Override**: Infrastructure settings cannot be overridden per-project anymore. This is intentional for consistency.

## Customization

If you need different infrastructure settings, modify the CLI source:

1. Edit `autonia-cli/src/utils/config.ts`
2. Update `AUTONIA_DEFAULTS` object
3. Rebuild: `npm run build`
4. Reinstall: `npm link`

Example:

```typescript
export const AUTONIA_DEFAULTS = {
  projectId: "your-custom-project-id",
  region: "us-central1", // Changed from asia-south1
  brokerUrl: "https://your-broker.run.app",
  // ... other settings
} as const;
```

## FAQ

### Q: Can I still override the service name?

**A:** Yes! Use `autonia deploy --service other-name`

### Q: What if I need different regions for different projects?

**A:** The CLI is opinionated and uses one region. For multiple regions, you'd need to modify the CLI source or use different CLI installations.

### Q: Do I need to update my config file immediately?

**A:** No, old config files work fine. The CLI only reads `serviceName` now.

### Q: Can I see what settings are being used?

**A:** Yes! Run `autonia init` and it displays all embedded settings:

```
Using embedded configuration:
  Project ID: protean-acrobat-458913-n8
  Region: asia-south1
  Broker URL: https://broker-service-95057172923.asia-south1.run.app
  Memory: 2Gi, CPU: 2
```

### Q: How do I deploy to staging vs production?

**A:** Use different service names:

```bash
autonia deploy --service my-app-staging
autonia deploy --service my-app-production
```

## Benefits

✅ **Faster Setup**: One command, one value  
✅ **Fewer Errors**: No configuration mistakes  
✅ **Consistency**: All deployments identical  
✅ **Better DX**: Less to remember  
✅ **Team Friendly**: No config conflicts

## Example: Before & After

### Before

```bash
# Step 1: Complex init
autonia init
? GCP Project ID: protean-acrobat-458913-n8
? Autonia Broker URL: https://broker-service-95057172923.asia-south1.run.app
? Service name: my-app
? Region: asia-south1
? Would you like to configure advanced settings? No

# Step 2: Deploy
autonia deploy
```

### After

```bash
# Step 1: Simple init
autonia init
? Service name: my-app

# Step 2: Deploy
autonia deploy
```

**Result**: Same deployment, less friction! 🎉

## Need Help?

- Check [README.md](README.md) for full documentation
- See [QUICKSTART.md](QUICKSTART.md) for examples
- Run `autonia <command> --help` for command help
