# Autonia CLI & Broker Service

This project includes a comprehensive deployment solution for Autonia applications using Google Cloud Run. The solution consists of two main components:

1. **Autonia CLI** - A command-line tool for developers
2. **Autonia Broker Service** - A cloud service that handles deployments

## Architecture Overview

```
Developer Machine → Autonia CLI → Broker Service → Google Cloud Build → Cloud Run
```

The CLI packages your application and sends it to the broker service, which then uses Google Cloud Build to deploy to Cloud Run.

## Quick Start

### 1. Deploy the Broker Service

First, deploy the broker service to your Google Cloud project:

```bash
cd autonia-broker
npm install
npm run build
./deploy-broker.sh
```

This will deploy the broker service and provide you with a service URL.

### 2. Install and Configure the CLI

```bash
cd autonia-cli
npm install
npm run build
npm link  # This makes the 'autonia' command available globally
```

### 3. Initialize Your Project

In your Autonia application directory:

```bash
autonia init --project-id your-project-id
```

This creates an `autonia.config.json` file with default settings.

### 4. Deploy Your Application

```bash
autonia deploy --appname your-app-name
```

## Configuration

### Autonia Configuration File (`autonia.config.json`)

```json
{
  "projectId": "your-gcp-project-id",
  "region": "us-central1",
  "brokerUrl": "https://autonia-broker-xxxxx-uc.a.run.app",
  "serviceName": "your-app-name",
  "memory": "2Gi",
  "cpu": "2",
  "timeout": "300",
  "concurrency": 80,
  "minInstances": 0,
  "maxInstances": 10,
  "port": 3000
}
```

### Environment Variables

- `AUTONIA_BROKER_URL` - URL of the deployed broker service
- `PROJECT_ID` - Google Cloud Project ID (for broker deployment)

## CLI Commands

### `autonia init`

Initialize Autonia configuration for your project.

```bash
autonia init [options]

Options:
  --project-id <id>    Google Cloud Project ID
  --region <region>    Default deployment region (default: us-central1)
```

### `autonia deploy`

Deploy your application to Google Cloud Run.

```bash
autonia deploy [options]

Options:
  --appname <name>     Application name for deployment (required)
  --project-id <id>    Google Cloud Project ID
  --region <region>    Deployment region (default: us-central1)
  --broker-url <url>   Broker service URL
  --env-file <path>    Environment file path (default: .env)
  --config <path>      Configuration file path (default: autonia.config.json)
```

## Broker Service API

The broker service exposes the following endpoints:

### `POST /api/deploy`

Deploy an application package.

**Request:**

- `package` (file): Tar.gz package of the application
- `config` (JSON): Deployment configuration

**Response:**

```json
{
  "deploymentId": "uuid",
  "status": "initiated",
  "message": "Deployment started successfully"
}
```

### `GET /api/deploy/:deploymentId/status`

Get deployment status.

**Response:**

```json
{
  "deploymentId": "uuid",
  "status": "success",
  "serviceUrl": "https://your-app-xxxxx-uc.a.run.app",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:05:00.000Z"
}
```

### `GET /api/deployments`

List all deployments.

### `DELETE /api/deploy/:deploymentId`

Cancel a deployment.

## Project Structure

```
├── autonia-cli/                 # CLI tool
│   ├── src/
│   │   ├── index.ts            # Main CLI entry point
│   │   └── commands/
│   │       ├── deploy.ts       # Deploy command
│   │       └── init.ts         # Init command
│   ├── package.json
│   └── tsconfig.json
├── autonia-broker/             # Broker service
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   └── services/
│   │       ├── deployment.ts   # Deployment logic
│   │       └── storage.ts      # Package storage
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   ├── deploy-broker.sh
│   ├── package.json
│   └── tsconfig.json
└── autonia.config.json         # Example configuration
```

## Example Usage

### Complete Deployment Workflow

1. **Set up the broker service:**

```bash
cd autonia-broker
npm install && npm run build
export PROJECT_ID=your-project-id
./deploy-broker.sh
# Note the service URL from the output
```

2. **Install the CLI:**

```bash
cd ../autonia-cli
npm install && npm run build && npm link
```

3. **Deploy your application:**

```bash
cd /path/to/your/autonia/app
export AUTONIA_BROKER_URL=https://autonia-broker-xxxxx-uc.a.run.app
autonia init --project-id your-project-id
autonia deploy --appname restaurant-assistant
```

### Monitoring Deployments

Check deployment status:

```bash
# The CLI will automatically poll and show status
# Or check via the broker API directly:
curl https://autonia-broker-xxxxx-uc.a.run.app/api/deployments
```

View application logs:

```bash
gcloud logs tail --follow --service=your-app-name --project=your-project-id
```

## Security Considerations

1. **Service Account Permissions**: The broker service runs with a dedicated service account that has minimal required permissions.

2. **Authentication**: Currently, the broker service allows unauthenticated access. In production, implement proper authentication.

3. **Package Validation**: The broker service should validate uploaded packages before deployment.

4. **Resource Limits**: Configure appropriate memory and CPU limits for both the broker service and deployed applications.

## Troubleshooting

### Common Issues

1. **"Broker URL not set"**: Set the `AUTONIA_BROKER_URL` environment variable or specify it in your config file.

2. **"Build failed"**: Check the Cloud Build logs in the Google Cloud Console.

3. **"Permission denied"**: Ensure the broker service account has the necessary permissions.

4. **"Package too large"**: The current limit is 100MB. For larger applications, consider optimizing your build.

### Debug Commands

```bash
# Check broker service health
curl https://your-broker-url/health

# View broker service logs
gcloud logs tail --follow --service=autonia-broker --project=your-project-id

# Check CLI configuration
autonia init --help
```

## Development

### Building the CLI

```bash
cd autonia-cli
npm install
npm run build
```

### Building the Broker Service

```bash
cd autonia-broker
npm install
npm run build
```

### Running Locally

```bash
# Start broker service locally
cd autonia-broker
npm run dev

# Use CLI with local broker
export AUTONIA_BROKER_URL=http://localhost:8080
autonia deploy --appname test-app
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
