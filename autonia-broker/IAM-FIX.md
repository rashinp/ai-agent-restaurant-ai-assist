# IAM Policy Fix for Public Access

## Problem

Deployments were failing with this error:

```
Setting IAM policy failed, try "gcloud beta run services add-iam-policy-binding --region=asia-south1 --member=allUsers --role=roles/run.invoker restaurant-ai-assistant-5"
```

Or:

```
ERROR: (gcloud.run.services.add-iam-policy-binding) PERMISSION_DENIED: Permission 'run.services.setIamPolicy' denied on resource...
This command is authenticated as 95057172923-compute@developer.gserviceaccount.com
```

## Root Causes

1. The `--allow-unauthenticated` flag in `gcloud run deploy` sometimes doesn't properly set the IAM policy
2. **The Cloud Build service account lacks permissions** to set IAM policies on Cloud Run services

## Prerequisites

Before using the broker, you **must** grant the Cloud Build service account the necessary permissions.

## Solution

### Step 1: Grant Permissions (One-Time Setup)

Run the setup script to grant necessary permissions to the Cloud Build service account:

```bash
cd autonia-broker
./setup-permissions.sh YOUR_PROJECT_ID
```

Or manually grant the roles:

```bash
PROJECT_ID="protean-acrobat-458913-n8"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run Admin role (includes setIamPolicy permission)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

**Required Roles:**

- `roles/run.admin` - Deploy services and set IAM policies
- `roles/iam.serviceAccountUser` - Act as service accounts
- `roles/storage.admin` - Access GCS buckets (already have this)
- `roles/artifactregistry.admin` - Push Docker images (already have this)

### Step 2: Split Deployment into Two Cloud Build Steps

### Step 1: Deploy the Service

```javascript
{
  name: "gcr.io/cloud-builders/gcloud",
  args: [
    "run",
    "deploy",
    service,
    "--image",
    `${region}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}:$BUILD_ID`,
    "--region",
    region,
    "--platform",
    "managed",
    "--port",
    "3000",
    // No --allow-unauthenticated here!
  ],
}
```

### Step 2: Set IAM Policy (Only if Public)

```javascript
...(isPublic
  ? [
      {
        name: "gcr.io/cloud-builders/gcloud",
        args: [
          "run",
          "services",
          "add-iam-policy-binding",
          service,
          "--region",
          region,
          "--member",
          "allUsers",
          "--role",
          "roles/run.invoker",
          "--quiet",
        ],
      },
    ]
  : [])
```

## Why This Works

1. **Explicit IAM Command**: Uses the dedicated IAM policy command instead of relying on the flag
2. **Separate Step**: Ensures the service exists before setting IAM policy
3. **Conditional**: Only runs for public services (`isPublic === true`)
4. **Quiet Flag**: Prevents unnecessary output

## Changes Made

**File**: `autonia-broker/src/index.js`

### Before

```javascript
args: [
  "run",
  "deploy",
  service,
  // ...
  ...(isPublic ? ["--allow-unauthenticated"] : ["--no-allow-unauthenticated"]),
  "--port",
  "3000",
  // ...
],
```

### After

```javascript
// Step 1: Deploy
args: [
  "run",
  "deploy",
  service,
  // ...
  "--port",
  "3000",
  // ... (no --allow-unauthenticated)
],

// Step 2: Set IAM (separate step)
...(isPublic
  ? [
      {
        name: "gcr.io/cloud-builders/gcloud",
        args: [
          "run",
          "services",
          "add-iam-policy-binding",
          service,
          "--region",
          region,
          "--member",
          "allUsers",
          "--role",
          "roles/run.invoker",
          "--quiet",
        ],
      },
    ]
  : []),
```

## Setup Instructions

### 1. Run Permission Setup (Required - Do This First!)

```bash
cd autonia-broker
./setup-permissions.sh protean-acrobat-458913-n8
```

Output:

```
🔧 Setting up permissions for Autonia broker...
Project ID: protean-acrobat-458913-n8
Project Number: 95057172923
Cloud Build SA: 95057172923@cloudbuild.gserviceaccount.com

📋 Granting roles to Cloud Build service account...
  ✓ roles/run.admin (Cloud Run Admin)
  ✓ roles/iam.serviceAccountUser (Service Account User)
  ✓ roles/storage.admin (Storage Admin)
  ✓ roles/artifactregistry.admin (Artifact Registry Admin)

✅ Permissions setup complete!
```

### 2. Deploy Your App

Now deployments will work:

```bash
$ autonia deploy

✅ Build completed
✅ Created my-app.zip
⠋ Uploading...

# Cloud Build will now run:
# 1. Build Docker image
# 2. Push to registry
# 3. Deploy to Cloud Run
# 4. Set IAM policy (add-iam-policy-binding) ← Works now!

✅ Deployment completed successfully!

  🌐 Service URL:
     https://my-app-xxxxx-uc.a.run.app

  🔓 Public Access: Enabled  ← Should work now!
```

## Verification

After deployment, verify public access:

```bash
# Test without authentication
curl https://your-service-url.run.app

# Should work! If you get 403, check IAM:
gcloud run services get-iam-policy YOUR_SERVICE \
  --region asia-south1

# Should show:
# bindings:
# - members:
#   - allUsers
#   role: roles/run.invoker
```

## Rollback (If Needed)

If you need private services, the CLI already supports it via the embedded default:

```typescript
// In autonia-cli/src/utils/config.ts
allowUnauthenticated: false; // Change to false for private
```

Then rebuild the CLI and redeploy.

## Benefits

✅ **Reliable**: No more IAM policy failures  
✅ **Explicit**: Clear what's happening  
✅ **Flexible**: Easy to make private (skip the step)  
✅ **Proper**: Uses the correct gcloud command  
✅ **Works First Time**: No retry needed

## Deployment Process Now

```
1. Generate Dockerfile
2. Build Docker image
3. Push to Artifact Registry
4. Deploy to Cloud Run (without IAM flag)
5. Set IAM policy (explicit binding) ← NEW STEP!
6. Return service URL
```

## Summary

The IAM policy is now set **explicitly** in a separate Cloud Build step, ensuring reliable public access without errors! 🎉
