#!/usr/bin/env bash
set -euo pipefail

# install-local.sh
# Installs @autonia/cli locally for development

echo "📦 Installing @autonia/cli dependencies..."
npm install

echo "🔨 Building CLI..."
npm run build

echo "🔗 Linking CLI globally..."
npm link

echo ""
echo "✅ @autonia/cli installed successfully!"
echo ""
echo "You can now use the 'autonia' command:"
echo "  autonia init       - Initialize a new project"
echo "  autonia deploy     - Deploy your application"
echo "  autonia logs       - View application logs"
echo ""
echo "To unlink, run: npm unlink -g @autonia/cli"

