#!/bin/bash

# Restaurant AI Assistant - Cloud Build Deployment Script
# This script deploys the application to Google Cloud Run using Cloud Build

set -e

# Configuration
PROJECT_ID="protean-acrobat-458913-n8"
SERVICE_NAME="ai-restaurant-assistant"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required files exist
check_requirements() {
    print_status "Checking deployment requirements..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found!"
        exit 1
    fi
    
    
    if [ ! -f "cloudbuild.yaml" ]; then
        print_error "cloudbuild.yaml not found!"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found! Make sure to set environment variables manually in Cloud Run."
    fi
    
    print_status "All required files found."
}

# Function to convert .env to .env.yaml for Cloud Run
convert_env_file() {
    if [ -f ".env" ]; then
        print_status "Converting .env to environment variables string..."
        
        # Create .env.yaml from .env
        echo "# Environment variables for Cloud Run" > .env.yaml
        
        # Build environment variables string for gcloud command
        ENV_VARS=""
        
        # Read .env file and convert to YAML format and env string
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            if [[ -n "$key" && ! "$key" =~ ^[[:space:]]*# ]]; then
                # Remove quotes if present and escape special characters
                value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/'/\\\\'/g")
                echo "$key: '$value'" >> .env.yaml
                
                # Build environment variables string
                if [ -n "$ENV_VARS" ]; then
                    ENV_VARS="$ENV_VARS,$key=$value"
                else
                    ENV_VARS="$key=$value"
                fi
            fi
        done < .env
        
        # Export the environment variables string for use in cloudbuild.yaml substitution
        export ENV_VARS_STRING="$ENV_VARS"
        
        print_status "Environment variables converted to .env.yaml"
        print_status "Found $(wc -l < .env.yaml) environment variables"
        print_status "Environment variables string: $ENV_VARS_STRING"
    else
        print_warning "No .env file found. Will use basic environment variables only."
        export ENV_VARS_STRING="NODE_ENV=production"
    fi
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        --project=$PROJECT_ID
    
    print_status "APIs enabled successfully."
}

# Function to set up Cloud Build permissions
setup_permissions() {
    print_status "Setting up Cloud Build permissions..."
    
    # Get the Cloud Build service account
    CLOUDBUILD_SA=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@cloudbuild.gserviceaccount.com
    
    # Grant Cloud Run Admin role to Cloud Build service account
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$CLOUDBUILD_SA" \
        --role="roles/run.admin" \
        --quiet
    
    # Grant Service Account User role to deploy to Cloud Run
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$CLOUDBUILD_SA" \
        --role="roles/iam.serviceAccountUser" \
        --quiet
    
    print_status "Permissions configured successfully."
}

# Function to submit build to Cloud Build
submit_build() {
    print_status "Submitting build to Google Cloud Build..."
    
    gcloud builds submit \
        --config=cloudbuild.yaml \
        --project=$PROJECT_ID \
        --region=$REGION \
        .
    
    if [ $? -eq 0 ]; then
        print_status "Build submitted successfully!"
    else
        print_error "Build submission failed!"
        exit 1
    fi
}

# Function to get service URL
get_service_url() {
    print_status "Getting service URL..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)")
    
    if [ -n "$SERVICE_URL" ]; then
        print_status "Service deployed successfully!"
        print_status "Service URL: $SERVICE_URL"
    else
        print_warning "Could not retrieve service URL. Check Cloud Console."
    fi
}

# Function to show logs
show_logs() {
    print_status "To view logs, run:"
    echo "gcloud logs tail --follow --service=$SERVICE_NAME --project=$PROJECT_ID"
}

# Main deployment function
main() {
    print_status "Starting deployment of $SERVICE_NAME to Google Cloud Run..."
    print_status "Project ID: $PROJECT_ID"
    print_status "Region: $REGION"
    echo
    
    # Check if gcloud is installed and authenticated
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
    
    # Set the project
    gcloud config set project $PROJECT_ID
    
    # Run deployment steps
    check_requirements
    convert_env_file
    enable_apis
    setup_permissions
    submit_build
    get_service_url
    show_logs
    
    print_status "Deployment process completed!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Restaurant AI Assistant - Cloud Build Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dry-run      Check requirements without deploying"
        echo ""
        echo "Environment Variables:"
        echo "  PROJECT_ID     Google Cloud Project ID (default: $PROJECT_ID)"
        echo "  SERVICE_NAME   Cloud Run service name (default: $SERVICE_NAME)"
        echo "  REGION         Deployment region (default: $REGION)"
        echo ""
        echo "This script will:"
        echo "  1. Check deployment requirements"
        echo "  2. Convert .env to .env.yaml format"
        echo "  3. Enable required Google Cloud APIs"
        echo "  4. Set up Cloud Build permissions"
        echo "  5. Submit build to Cloud Build"
        echo "  6. Deploy to Cloud Run"
        exit 0
        ;;
    --dry-run)
        print_status "Running in dry-run mode..."
        check_requirements
        convert_env_file
        print_status "Dry-run completed. All requirements satisfied."
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
esac
