# Automatic Zip Cleanup Update (v0.1.2)

## What Changed

The CLI now **automatically removes generated zip files** after deployment to keep your project directory clean.

## Behavior

### Generated Zips (Cleaned Up)

```bash
$ autonia deploy

✅ Build completed
✅ Created restaurant-ai-assistant.zip  ← Created
⠋ Uploading...                         ← Uploaded
✅ Deployment completed!                ← Deleted automatically

$ ls *.zip
# No zip files! Clean directory ✅
```

### User-Provided Zips (Preserved)

```bash
$ autonia deploy --zip my-backup.zip

✅ Deployment completed!

$ ls *.zip
my-backup.zip  ← Still there! ✅
```

## When Cleanup Happens

✅ **After successful deployment**

```bash
$ autonia deploy
✅ Deployment completed!
# Zip deleted ✅
```

✅ **After failed deployment**

```bash
$ autonia deploy
❌ Deployment failed
# Zip still deleted ✅
```

❌ **NOT for user-provided zips**

```bash
$ autonia deploy --zip my.zip
# my.zip is preserved ✅
```

## Implementation

### Track Generated Zips

```typescript
let shouldCleanupZip = false;

if (!options.zip) {
  shouldCleanupZip = true; // We created it
  zipFile = await createDeploymentZip(serviceName);
}
```

### Cleanup on Success

```typescript
uploadSpinner.succeed("✅ Deployment completed!");

if (shouldCleanupZip && zipFile) {
  try {
    unlinkSync(zipFile); // Delete the zip
  } catch {
    // Ignore errors
  }
}
```

### Cleanup on Failure

```typescript
catch (error) {
  uploadSpinner.fail("❌ Deployment failed");

  if (shouldCleanupZip && zipFile) {
    unlinkSync(zipFile);  // Delete even on failure
  }
}
```

## Benefits

✅ **Clean Projects**: No leftover deployment artifacts  
✅ **Automatic**: No manual cleanup needed  
✅ **Smart**: Preserves intentional backups (--zip flag)  
✅ **Consistent**: Works on success and failure  
✅ **Disk Space**: Saves space over multiple deployments

## Examples

### Before (v0.1.1)

```bash
$ autonia deploy
✅ Deployment completed!

$ ls
restaurant-ai-assistant.zip  ← Left behind
src/
dist/
package.json

$ autonia deploy --service staging
✅ Deployment completed!

$ ls *.zip
restaurant-ai-assistant.zip  ← Old one
staging.zip                  ← New one
# Accumulating zip files! ❌
```

### After (v0.1.2)

```bash
$ autonia deploy
✅ Deployment completed!

$ ls *.zip
# No files! ✅

$ autonia deploy --service staging
✅ Deployment completed!

$ ls *.zip
# Still no files! ✅
# Clean directory maintained automatically
```

## Edge Cases

### Interrupted Deployment

If you press Ctrl+C during upload, the zip might remain:

```bash
$ autonia deploy
⠋ Uploading...
^C  ← Interrupted

$ ls *.zip
my-app.zip  ← Still there (cleanup didn't run)

# Solution: Just run deploy again or rm *.zip
```

### Permission Issues

If the CLI can't delete the file (very rare):

```typescript
try {
  unlinkSync(zipFile);
} catch (err) {
  // Silently ignore - don't fail deployment
}
```

The deployment succeeds even if cleanup fails.

### Want to Keep the Zip?

Use your own zip file:

```bash
# Create your own
zip -r my-backup.zip package.json dist/

# Deploy with it (won't be deleted)
autonia deploy --zip my-backup.zip
```

## Command Matrix

| Command                       | Creates Zip | Cleans Up |
| ----------------------------- | ----------- | --------- |
| `autonia deploy`              | ✅ Yes      | ✅ Yes    |
| `autonia deploy --skip-build` | ✅ Yes      | ✅ Yes    |
| `autonia deploy --zip my.zip` | ❌ No       | ❌ No     |

## Files Changed

- ✅ `src/commands/deploy.ts` - Added cleanup logic
- ✅ `README.md` - Updated deployment steps
- ✅ `CHANGELOG.md` - Documented change
- ✅ `DEPLOYMENT-FLOW.md` - Added cleanup step
- ✅ `ZIP-CLEANUP.md` - NEW: Detailed cleanup documentation
- ✅ `CLEANUP-UPDATE.md` - This file

## Summary

🧹 **Automatic cleanup** keeps your project directory tidy  
✅ **Transparent** - just works without configuration  
🔒 **Safe** - preserves user-provided files  
⚡ **No changes needed** - existing workflows continue to work

Your project stays clean without any extra effort! 🎉
