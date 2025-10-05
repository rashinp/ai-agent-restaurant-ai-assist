#!/bin/bash

# Autonia CLI & Broker Setup Script
# This script sets up the complete Autonia deployment system

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-protean-acrobat-458913-n8}"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "All prerequisites satisfied."
}

# Function to build and deploy broker service
setup_broker() {
    print_header "Setting up Autonia Broker Service..."
    
    cd autonia-broker
    
    print_status "Installing broker dependencies..."
    npm install
    
    print_status "Building broker service..."
    npm run build
    
    print_status "Deploying broker service to Cloud Run..."
    export PROJECT_ID=$PROJECT_ID
    ./deploy-broker.sh
    
    # Get the service URL
    BROKER_URL=$(gcloud run services describe autonia-broker \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)" 2>/dev/null || echo "")
    
    if [ -n "$BROKER_URL" ]; then
        print_status "Broker service deployed successfully!"
        print_status "Broker URL: $BROKER_URL"
        export AUTONIA_BROKER_URL=$BROKER_URL
    else
        print_error "Failed to get broker service URL"
        exit 1
    fi
    
    cd ..
}

# Function to build and install CLI
setup_cli() {
    print_header "Setting up Autonia CLI..."
    
    cd autonia-cli
    
    print_status "Installing CLI dependencies..."
    npm install
    
    print_status "Building CLI..."
    npm run build
    
    print_status "Installing CLI globally..."
    npm link
    
    print_status "CLI installed successfully! 'autonia' command is now available."
    
    cd ..
}

# Function to initialize project configuration
setup_config() {
    print_header "Setting up project configuration..."
    
    # Update autonia.config.json with the actual broker URL
    if [ -n "$AUTONIA_BROKER_URL" ]; then
        cat > autonia.config.json << EOF
{
  "projectId": "$PROJECT_ID",
  "region": "$REGION",
  "brokerUrl": "$AUTONIA_BROKER_URL",
  "serviceName": "restaurant-ai-assistant",
  "memory": "2Gi",
  "cpu": "2",
  "timeout": "300",
  "concurrency": 80,
  "minInstances": 0,
  "maxInstances": 10,
  "port": 3000
}
EOF
        print_status "Configuration file updated with broker URL."
    fi
}

# Function to test the setup
test_setup() {
    print_header "Testing setup..."
    
    # Test CLI installation
    if command -v autonia &> /dev/null; then
        print_status "CLI installation verified."
        autonia --version
    else
        print_error "CLI installation failed."
        exit 1
    fi
    
    # Test broker service
    if [ -n "$AUTONIA_BROKER_URL" ]; then
        if curl -s "$AUTONIA_BROKER_URL/health" | grep -q "healthy"; then
            print_status "Broker service is healthy."
        else
            print_warning "Broker service health check failed."
        fi
    fi
}

# Function to show usage instructions
show_usage() {
    print_header "Setup Complete!"
    
    echo ""
    echo "🎉 Autonia deployment system is ready!"
    echo ""
    echo "📋 What was set up:"
    echo "   ✅ Autonia Broker Service deployed to Cloud Run"
    echo "   ✅ Autonia CLI installed globally"
    echo "   ✅ Project configuration created"
    echo ""
    echo "🚀 Quick start:"
    echo "   1. Build your application: npm run build"
    echo "   2. Deploy with Autonia: autonia deploy --appname restaurant-ai-assistant"
    echo ""
    echo "📖 Available commands:"
    echo "   autonia init                    - Initialize new project"
    echo "   autonia deploy --appname <name> - Deploy application"
    echo "   npm run deploy:autonia          - Deploy this project"
    echo "   npm run broker:deploy           - Redeploy broker service"
    echo ""
    echo "🔗 URLs:"
    if [ -n "$AUTONIA_BROKER_URL" ]; then
        echo "   Broker Service: $AUTONIA_BROKER_URL"
        echo "   Health Check: $AUTONIA_BROKER_URL/health"
    fi
    echo ""
    echo "🔧 Environment variables (add to your shell profile):"
    if [ -n "$AUTONIA_BROKER_URL" ]; then
        echo "   export AUTONIA_BROKER_URL=$AUTONIA_BROKER_URL"
    fi
    echo "   export PROJECT_ID=$PROJECT_ID"
    echo ""
    echo "📚 Documentation: README-AUTONIA-CLI.md"
}

# Main setup function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Autonia Setup Script                     ║"
    echo "║              CLI Tool & Broker Service Setup                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_status "Project ID: $PROJECT_ID"
    print_status "Region: $REGION"
    echo ""
    
    # Set the project
    gcloud config set project $PROJECT_ID
    
    # Run setup steps
    check_prerequisites
    setup_broker
    setup_cli
    setup_config
    test_setup
    show_usage
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Autonia Setup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h         Show this help message"
        echo "  --broker-only      Set up only the broker service"
        echo "  --cli-only         Set up only the CLI tool"
        echo ""
        echo "Environment Variables:"
        echo "  PROJECT_ID         Google Cloud Project ID (default: $PROJECT_ID)"
        echo ""
        echo "This script will:"
        echo "  1. Check prerequisites (gcloud, node, npm)"
        echo "  2. Build and deploy the broker service to Cloud Run"
        echo "  3. Build and install the CLI tool globally"
        echo "  4. Set up project configuration"
        echo "  5. Test the setup"
        exit 0
        ;;
    --broker-only)
        print_status "Setting up broker service only..."
        check_prerequisites
        setup_broker
        print_status "Broker service setup completed!"
        ;;
    --cli-only)
        print_status "Setting up CLI tool only..."
        check_prerequisites
        setup_cli
        print_status "CLI tool setup completed!"
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
