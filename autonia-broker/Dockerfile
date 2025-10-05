# Use Node.js LTS
FROM node:20-alpine

# Create workdir
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source application
COPY src/ ./src/

# Expose default Cloud Run port
ENV PORT=8080
CMD ["npm","start"]
