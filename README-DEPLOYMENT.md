# Restaurant AI Assistant - Google Cloud Run Deployment

This guide explains how to deploy the Restaurant AI Assistant to Google Cloud Run using Cloud Build.

## Prerequisites

1. **Google Cloud CLI**: Install and configure the `gcloud` CLI

   ```bash
   # Install gcloud CLI (if not already installed)
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # Authenticate with Google Cloud
   gcloud auth login

   # Set your project
   gcloud config set project protean-acrobat-458913-n8
   ```

2. **Environment Variables**: Create a `.env` file based on `env.example`
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

## Deployment Files

The deployment setup includes:

- **`Dockerfile`**: Multi-stage Docker build for the Node.js application
- **`cloudbuild.yaml`**: Cloud Build configuration for automated builds
- **`deploy-cloudbuild.sh`**: Deployment script with full automation
- **`.gcloudignore`**: Excludes unnecessary files from the build
- **`env.example`**: Template for environment variables

## Quick Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x deploy-cloudbuild.sh

# Run the deployment
./deploy-cloudbuild.sh
```

### Option 2: Manual Deployment

1. **Enable APIs**:

   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
   ```

2. **Set up permissions**:

   ```bash
   # Get Cloud Build service account
   CLOUDBUILD_SA=$(gcloud projects describe protean-acrobat-458913-n8 --format="value(projectNumber)")@cloudbuild.gserviceaccount.com

   # Grant permissions
   gcloud projects add-iam-policy-binding protean-acrobat-458913-n8 \
     --member="serviceAccount:$CLOUDBUILD_SA" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding protean-acrobat-458913-n8 \
     --member="serviceAccount:$CLOUDBUILD_SA" \
     --role="roles/iam.serviceAccountUser"
   ```

3. **Convert environment variables**:

   ```bash
   # The deployment script does this automatically, but if doing manually:
   # Create .env.yaml from your .env file for Cloud Run
   ```

4. **Submit build**:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml --project=protean-acrobat-458913-n8
   ```

## Configuration Details

### Cloud Run Service Configuration

- **Service Name**: `ai-restaurant-assistant`
- **Region**: `us-central1`
- **Memory**: `2Gi`
- **CPU**: `2`
- **Timeout**: `300s`
- **Concurrency**: `80`
- **Min Instances**: `0`
- **Max Instances**: `10`
- **Port**: `8080`

### Build Configuration

- **Machine Type**: `E2_HIGHCPU_8`
- **Disk Size**: `100GB`
- **Timeout**: `1200s` (20 minutes)
- **Node Version**: `20-alpine`
- **Package Manager**: `pnpm@10.6.1`

## Environment Variables

The application expects several environment variables. See `env.example` for a complete list including:

- Database configuration
- AI/LLM API keys
- Stripe payment integration
- Security settings
- External API configurations

## Monitoring and Logs

### View Logs

```bash
# Real-time logs
gcloud logs tail --follow --service=ai-restaurant-assistant --project=protean-acrobat-458913-n8

# Or use the npm script
npm run gcp:logs
```

### Service Status

```bash
# Check service status
gcloud run services describe ai-restaurant-assistant \
  --region=us-central1 \
  --project=protean-acrobat-458913-n8
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check that all dependencies are properly specified in `package.json`
2. **Deployment Fails**: Verify Cloud Build service account has necessary permissions
3. **Service Won't Start**: Check environment variables and logs
4. **Memory Issues**: Increase memory allocation in `cloudbuild.yaml`

### Debug Commands

```bash
# Check build history
gcloud builds list --project=protean-acrobat-458913-n8

# Get build details
gcloud builds describe BUILD_ID --project=protean-acrobat-458913-n8

# Test locally with Docker
docker build -t ai-restaurant-assistant .
docker run -p 8080:8080 --env-file .env ai-restaurant-assistant
```

## Cost Optimization

- **Cold Starts**: Min instances set to 0 to reduce costs
- **Concurrency**: Set to 80 to handle multiple requests per instance
- **Auto-scaling**: Configured to scale based on demand
- **Build Caching**: Docker layer caching enabled for faster builds

## Security

- Environment variables are securely managed through Cloud Run
- Service runs with minimal required permissions
- Container is built from official Node.js Alpine image
- No sensitive data is included in the container image

## Updates and Maintenance

To update the application:

1. Push changes to your repository
2. Run the deployment script again: `./deploy-cloudbuild.sh`
3. Cloud Build will automatically build and deploy the new version

The deployment uses rolling updates, so there's minimal downtime during updates.

## Support

For issues with the deployment:

1. Check the Cloud Build logs
2. Verify environment variables are correctly set
3. Ensure all required APIs are enabled
4. Check Cloud Run service logs for runtime issues
