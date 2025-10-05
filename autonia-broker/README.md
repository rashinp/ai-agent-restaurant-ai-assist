# Autonia Broker

A Node.js service that handles Cloud Run deployments via Cloud Build.

## Prerequisites

- Google Cloud Project with:
  - Cloud Run API enabled
  - Cloud Build API enabled
  - Artifact Registry API enabled
  - Storage API enabled
- GCS bucket for deployment uploads
- Properly configured service account permissions

## Setup

### 1. Grant Permissions (Required!)

The Cloud Build service account needs permissions to deploy Cloud Run services and set IAM policies:

```bash
./setup-permissions.sh YOUR_PROJECT_ID
```

This grants:

- `roles/run.admin` - Deploy services and manage IAM policies
- `roles/iam.serviceAccountUser` - Act as service accounts
- `roles/storage.admin` - Access GCS buckets
- `roles/artifactregistry.admin` - Push Docker images

### 2. Set Environment Variables

Create a `.env` file:

```env
PROJECT_ID=your-gcp-project-id
DEPLOY_BUCKET=your-gcs-bucket-name
PORT=8080
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Deploy the Broker

#### Option A: Deploy to Cloud Run

```bash
gcloud run deploy broker-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=your-project,DEPLOY_BUCKET=your-bucket
```

#### Option B: Run Locally

```bash
npm start
```

## Usage

### Deploy Endpoint

**POST** `/deploy`

Upload a deployment package and trigger Cloud Run deployment.

**Form Data:**

- `source` (file) - Zip file containing: package.json, dist/, pnpm-lock.yaml, .env
- `service` (string) - Service name
- `region` (string) - GCP region (default: asia-south1)
- `repo` (string) - Artifact Registry repo (default: app-images)
- `allowUnauthenticated` (string) - "true" or "false" (default: "true")

**Response:**

```json
{
  "message": "Deployment successful",
  "operation": "operations/...",
  "service": "my-app",
  "region": "asia-south1",
  "url": "https://my-app-xxxxx.run.app",
  "publicAccess": true,
  "status": "SUCCESS",
  "logUrl": "https://console.cloud.google.com/cloud-build/..."
}
```

### Example with curl

```bash
curl -X POST https://broker-service-xxxxx.run.app/deploy \
  -F "source=@my-app.zip" \
  -F "service=my-app" \
  -F "region=asia-south1" \
  -F "allowUnauthenticated=true"
```

## How It Works

1. Receives deployment package (zip)
2. Extracts `.env` variables from zip
3. Uploads zip to GCS bucket
4. Triggers Cloud Build with steps:
   - Generate runtime Dockerfile
   - Build Docker image
   - Push to Artifact Registry
   - Deploy to Cloud Run
   - Set IAM policy for public access (if requested)
5. Waits for Cloud Build to complete
6. Fetches Cloud Run service URL
7. Returns complete deployment info

## Deployment Process

```
Client (CLI)
    ↓
[POST /deploy with zip]
    ↓
Broker receives upload
    ↓
Extract .env from zip
    ↓
Upload to GCS
    ↓
Trigger Cloud Build:
  • Generate Dockerfile
  • docker build
  • docker push
  • gcloud run deploy
  • gcloud run services add-iam-policy-binding (if public)
    ↓
Wait for completion (2-5 min)
    ↓
Fetch service URL
    ↓
Return to client
```

## Generated Dockerfile

The broker generates a production Dockerfile:

```dockerfile
FROM node:20

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN mkdir -p ./data
RUN pnpm install --frozen-lockfile --prod

COPY dist ./dist

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["pnpm","run","serve"]
```

## Environment Variables

The broker injects `.env` variables from the zip file into the Cloud Run service via `--set-env-vars`.

## Troubleshooting

### Permission Denied Errors

```
ERROR: Permission 'run.services.setIamPolicy' denied
```

**Solution:** Run the permissions setup script:

```bash
./setup-permissions.sh YOUR_PROJECT_ID
```

### Build Timeout

Increase Cloud Build timeout (default is 10 minutes):

```javascript
build: {
  timeout: '1800s',  // 30 minutes
  // ...
}
```

### Image Push Failures

Ensure Artifact Registry repo exists:

```bash
gcloud artifacts repositories create app-images \
  --repository-format=docker \
  --location=asia-south1
```

## Files

- `src/index.js` - Main broker service
- `setup-permissions.sh` - Permission setup script
- `package.json` - Dependencies
- `IAM-FIX.md` - IAM policy troubleshooting guide

## Dependencies

- `express` - Web server
- `multer` - File upload handling
- `@google-cloud/storage` - GCS operations
- `@google-cloud/cloudbuild` - Cloud Build API
- `@google-cloud/run` - Cloud Run API (for fetching URLs)
- `adm-zip` - Zip file parsing
- `dotenv` - Environment variables

## License

MIT
