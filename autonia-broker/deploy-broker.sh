#!/usr/bin/env bash
set -euo pipefail

# deploy-broker.sh
# Deploys the Autonia broker to Cloud Run with environment variables from .env

REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-broker-service}"

echo "🚀 Deploying Autonia Broker..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "💡 Create a .env file with the following variables:"
  echo "   PROJECT_ID=your-gcp-project-id"
  echo "   DEPLOY_BUCKET=your-gcs-bucket-name"
  echo "   SUPABASE_URL=https://your-project.supabase.co"
  echo "   SUPABASE_SERVICE_KEY=your-service-role-key"
  echo "   SUPABASE_ANON_KEY=your-anon-key"
  echo ""
  exit 1
fi

echo "📋 Loading environment variables from .env..."

# Load .env and build --set-env-vars string
ENV_VARS=""
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  
  # Remove leading/trailing whitespace and quotes
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  # Skip PORT (Cloud Run manages this)
  [[ "$key" == "PORT" ]] && continue
  
  # Add to ENV_VARS string
  if [ -z "$ENV_VARS" ]; then
    ENV_VARS="${key}=${value}"
  else
    ENV_VARS="${ENV_VARS},${key}=${value}"
  fi
  
  echo "   ✓ $key"
done < .env

echo ""
echo "🔧 Deployment configuration:"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo ""

# Deploy to Cloud Run
echo "📦 Deploying to Cloud Run..."

echo ""
echo "gcloud run deploy \"$SERVICE_NAME\" \\"
echo "  --region \"$REGION\" \\"
echo "  --platform managed \\"
echo "  --source . \\"
echo "  --allow-unauthenticated \\"
echo "  --set-env-vars \"$ENV_VARS\""

gcloud run deploy "$SERVICE_NAME" \
  --region "$REGION" \
  --platform managed \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🌐 Service URL:"
echo "   $SERVICE_URL"
echo ""
echo "🔗 Endpoints:"
echo "   Health: $SERVICE_URL/health"
echo "   Login:  $SERVICE_URL/auth/login"
echo ""
echo "💡 Next steps:"
echo "   1. Test health: curl $SERVICE_URL/health"
echo "   2. Test login:  open $SERVICE_URL/auth/login"
echo "   3. Update CLI if broker URL changed"
echo ""