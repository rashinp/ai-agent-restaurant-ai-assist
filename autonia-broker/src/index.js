// broker.js
import express from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import { CloudBuildClient } from "@google-cloud/cloudbuild";
import AdmZip from "adm-zip"; // unzip in-memory
import dotenv from "dotenv";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const storage = new Storage();
const cloudBuildClient = new CloudBuildClient();

const BUCKET = process.env.DEPLOY_BUCKET; // GCS bucket for uploads
const PROJECT_ID = process.env.PROJECT_ID;

// Helper: extract .env vars from uploaded zip
function extractEnvFromZip(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry(".env");
    if (!entry) return {};
    const envContent = entry.getData().toString("utf-8");
    return dotenv.parse(envContent);
  } catch (err) {
    console.error("Failed to parse .env:", err);
    return {};
  }
}

// Deploy endpoint
app.post("/deploy", upload.single("source"), async (req, res) => {
  try {
    const {
      service = "my-service",
      region = "asia-south1",
      repo = "app-images",
      allowUnauthenticated = "true", // Default to public access
    } = req.body;

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // Parse allowUnauthenticated as boolean
    const isPublic = allowUnauthenticated === "true" || allowUnauthenticated === true;

    // Extract .env and prepare for Cloud Run
    const envVars = extractEnvFromZip(req.file.buffer);
    const envString = Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");

    // Upload archive to GCS
    const filename = `${service}-${Date.now()}.zip`;
    await storage.bucket(BUCKET).file(filename).save(req.file.buffer);

    // Cloud Build steps (static, no Dockerfile from repo)
    const build = {
      source: { storageSource: { bucket: BUCKET, object: filename } },
      steps: [
        // Generate a runtime-only Dockerfile (no build)
        {
          name: "ubuntu",
          entrypoint: "bash",
          args: [
            "-c",
            `
set -e
cat > Dockerfile <<'EOF'
FROM node:20

# Use pnpm for installing production deps
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only manifests first for better caching
COPY package.json pnpm-lock.yaml* ./

RUN mkdir -p ./data

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy prebuilt app (dist) and any other runtime files (e.g., .env)
COPY dist ./dist
# NOTE: We don't bake .env into the image; broker injects env via --set-env-vars
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["pnpm","run","serve"]
EOF
        `,
          ],
        },

        // Build & push
        {
          name: "gcr.io/cloud-builders/docker",
          args: ["build", "-t", `${region}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}:$BUILD_ID`, "."],
        },
        {
          name: "gcr.io/cloud-builders/docker",
          args: ["push", `${region}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}:$BUILD_ID`],
        },

        // Deploy (broker continues to inject env vars parsed from the zip's .env)
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
            ...(envString ? ["--set-env-vars", envString] : []),
          ],
        },

        // Set IAM policy for public access (separate step to handle permissions properly)
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
      ],
      images: [`${region}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}:$BUILD_ID`],
    };

    // Trigger Cloud Build (don't wait for completion)
    const [operation] = await cloudBuildClient.createBuild({
      projectId: PROJECT_ID,
      build,
    });
    const initialBuild = operation.metadata.build;
    const buildId = initialBuild.id;

    // Return immediately with operation ID
    res.json({
      message: "Deployment started",
      operationId: buildId,
      service,
      region,
      publicAccess: isPublic,
      status: "BUILDING",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Status endpoint to check deployment progress
app.get("/status/:operationId", async (req, res) => {
  try {
    const operationId = req.params.operationId;
    const { service, region } = req.query;

    if (!operationId) {
      return res.status(400).json({ error: "operationId is required" });
    }

    console.log("Getting build status for operationId:", operationId);
    console.log("Project ID:", PROJECT_ID);
    // Get the build status
    const [build] = await cloudBuildClient.getBuild({
      projectId: PROJECT_ID,
      id: operationId,
    });

    const status = build.status;
    const response = {
      operationId,
      status,
      logUrl: build.logUrl,
      service,
      region,
    };

    // If build is complete and successful, fetch the service URL
    if (status === "SUCCESS" && service && region) {
      try {
        const { CloudRunClient } = await import("@google-cloud/run");
        const runClient = new CloudRunClient();

        const servicePath = runClient.servicePath(PROJECT_ID, region, service);
        const [serviceInfo] = await runClient.getService({ name: servicePath });

        response.url = serviceInfo.uri;
        response.message = "Deployment successful";
      } catch (err) {
        console.error("Failed to fetch service URL:", err);
        // Continue without URL
      }
    } else if (status === "FAILURE" || status === "TIMEOUT" || status === "CANCELLED") {
      response.message = "Deployment failed";
      response.error = `Build ${status.toLowerCase()}`;
    } else {
      response.message = "Deployment in progress";
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Broker app running on port " + (process.env.PORT || 8080));
});
