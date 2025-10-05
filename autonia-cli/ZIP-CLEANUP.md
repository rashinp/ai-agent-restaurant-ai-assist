# Automatic Zip Cleanup

## Overview

The CLI now automatically removes generated zip files after deployment to keep your project directory clean.

## How It Works

### Generated Zips (Automatic Cleanup)

When you run `autonia deploy` without the `--zip` flag, the CLI:

1. **Creates** a zip file (e.g., `my-app.zip`)
2. **Uploads** it to the broker
3. **Deletes** it automatically after upload (success or failure)

```bash
$ autonia deploy

✅ Build completed
✅ Created my-app.zip          ← Created
⠋ Uploading...                ← Uploaded
✅ Deployment completed!       ← Automatically deleted

$ ls *.zip
# No zip files! ✅
```

### User-Provided Zips (Preserved)

When you use `--zip` with an existing file, it's **not deleted**:

```bash
$ autonia deploy --zip my-custom.zip

✅ Deployment completed!

$ ls *.zip
my-custom.zip  ← Still there! ✅
```

## Implementation

### Tracking Generated Zips

```typescript
let zipFile = options.zip;
let shouldCleanupZip = false;

if (!zipFile) {
  shouldCleanupZip = true; // We created it
  zipFile = await createDeploymentZip(serviceName);
}
```

### Cleanup on Success

```typescript
uploadSpinner.succeed(chalk.green("✅ Deployment completed!"));

// Clean up generated zip
if (shouldCleanupZip && zipFile) {
  try {
    unlinkSync(zipFile);
  } catch (err) {
    // Ignore cleanup errors
  }
}
```

### Cleanup on Failure

```typescript
catch (error: any) {
  uploadSpinner.fail(chalk.red("❌ Deployment failed"));

  // Clean up even on failure
  if (shouldCleanupZip && zipFile) {
    try {
      unlinkSync(zipFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  // Show error...
}
```

## Behavior Matrix

| Command                       | Zip Creation     | Cleanup      |
| ----------------------------- | ---------------- | ------------ |
| `autonia deploy`              | ✅ Auto-created  | ✅ Deleted   |
| `autonia deploy --skip-build` | ✅ Auto-created  | ✅ Deleted   |
| `autonia deploy --zip my.zip` | ❌ User-provided | ❌ Preserved |

## Benefits

✅ **Cleaner Projects**: No leftover zip files  
✅ **Automatic**: No manual cleanup needed  
✅ **Smart**: Preserves user-provided files  
✅ **Consistent**: Works on success and failure  
✅ **Disk Space**: Saves space over time

## Examples

### Standard Deployment

```bash
$ ls
src/  dist/  package.json  autonia.config.json

$ autonia deploy
✅ Deployment completed!

$ ls
src/  dist/  package.json  autonia.config.json
# No my-app.zip! ✅
```

### Multiple Deployments

```bash
$ autonia deploy --service app-staging
✅ Deployment completed!
# app-staging.zip deleted

$ autonia deploy --service app-production
✅ Deployment completed!
# app-production.zip deleted

$ ls *.zip
# No zip files! ✅
```

### Failed Deployment

```bash
$ autonia deploy
❌ Deployment failed
Error: Build failed

$ ls *.zip
# No zip files even on failure! ✅
```

### Custom Zip (Preserved)

```bash
$ ls
my-backup.zip  src/  dist/

$ autonia deploy --zip my-backup.zip
✅ Deployment completed!

$ ls *.zip
my-backup.zip  ← Still there! ✅
```

## Edge Cases

### Permission Errors

If the CLI can't delete the zip (rare), it silently continues:

```typescript
try {
  unlinkSync(zipFile);
} catch (err) {
  // Ignore - don't fail deployment over cleanup
}
```

The deployment succeeds even if cleanup fails.

### Interrupted Deployments

If you interrupt (Ctrl+C) during upload, the zip might remain:

```bash
$ autonia deploy
⠋ Uploading...
^C

$ ls *.zip
my-app.zip  ← Still there (interrupted before cleanup)
```

Just run `rm *.zip` or deploy again.

## Troubleshooting

### "Why is my zip file still there?"

**Possible reasons:**

1. **User-provided zip**: Used `--zip` flag

   ```bash
   autonia deploy --zip my-file.zip  # Won't be deleted
   ```

2. **Interrupted**: Pressed Ctrl+C before cleanup

   ```bash
   # Manual cleanup:
   rm *.zip
   ```

3. **Permission issue**: CLI couldn't delete (rare)
   ```bash
   # Manual cleanup:
   rm *.zip
   ```

### "I want to keep the zip"

Use the `--zip` flag with your own file:

```bash
# Build manually
pnpm run build

# Create your own zip
zip -r my-app.zip package.json dist/

# Deploy with it (won't be deleted)
autonia deploy --zip my-app.zip
```

Or copy it before deploying:

```bash
autonia deploy
# Wait for it to create the zip, then:
# (In another terminal)
cp my-app.zip my-app-backup.zip
```

### "Can I disable cleanup?"

Not currently. The cleanup is intentional to keep projects clean.

If you need the zip, use `--zip` with your own file.

## Technical Details

### File System Operation

```typescript
import { unlinkSync } from "fs";

if (shouldCleanupZip && zipFile) {
  try {
    unlinkSync(zipFile); // Synchronous deletion
  } catch (err) {
    // Fail silently
  }
}
```

### Why Synchronous?

We use `unlinkSync` (not `unlink`) because:

- Cleanup happens after deployment response
- We want it to complete before showing success
- Errors don't affect deployment success

### Error Handling

Cleanup errors are **intentionally ignored**:

- Deployment success is more important
- Prevents failures due to permission issues
- User can manually delete if needed

## Summary

🧹 **Automatic cleanup** keeps projects tidy  
✅ **Works on success and failure**  
🔒 **Preserves user-provided zips**  
⚡ **No configuration needed**  
🎯 **Just works transparently**

Your project directory stays clean without any extra effort! 🎉
