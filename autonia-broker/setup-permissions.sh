#!/usr/bin/env bash
set -euo pipefail

# setup-permissions.sh
# Grants necessary permissions to Cloud Build service account for Autonia deployments

PROJECT_ID="${1:-protean-acrobat-458913-n8}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "🔧 Setting up permissions for Autonia broker..."
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo "Cloud Build SA: $CLOUDBUILD_SA"
echo "Compute Engine SA: $COMPUTE_SA"
echo ""

echo "Note: Cloud Build may use either service account depending on configuration."
echo ""

# Grant roles to both service accounts to ensure it works
echo "📋 Granting roles to Cloud Build service account..."

# 1. Cloud Run Admin - to deploy services
echo "  ✓ roles/run.admin (Cloud Run Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin" \
  --condition=None \
  --quiet

# 2. IAM Service Account User - to act as the Cloud Run service account
echo "  ✓ roles/iam.serviceAccountUser (Service Account User)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None \
  --quiet

# 3. Storage Admin - for GCS bucket access
echo "  ✓ roles/storage.admin (Storage Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet

# 4. Artifact Registry Admin - for pushing images
echo "  ✓ roles/artifactregistry.admin (Artifact Registry Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.admin" \
  --condition=None \
  --quiet

echo ""
echo "📋 Granting roles to Compute Engine service account (used by Cloud Build)..."

# Grant the same roles to Compute Engine service account
echo "  ✓ roles/run.admin (Cloud Run Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/run.admin" \
  --condition=None \
  --quiet

echo "  ✓ roles/iam.serviceAccountUser (Service Account User)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None \
  --quiet

echo "  ✓ roles/storage.admin (Storage Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet

echo "  ✓ roles/artifactregistry.admin (Artifact Registry Admin)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/artifactregistry.admin" \
  --condition=None \
  --quiet

echo ""
echo "✅ Permissions setup complete!"
echo ""
echo "Both service accounts now have:"
echo "  • Cloud Run Admin (deploy and manage services)"
echo "  • Service Account User (act as service accounts)"
echo "  • Storage Admin (access GCS buckets)"
echo "  • Artifact Registry Admin (push Docker images)"
echo ""
echo "Service Accounts configured:"
echo "  1. ${CLOUDBUILD_SA}"
echo "  2. ${COMPUTE_SA}"
echo ""
echo "You can now deploy services with public access via the Autonia broker! 🎉"
