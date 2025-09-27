FROM node:20

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install dependencies
RUN npm install --production --omit=dev --no-audit --no-fund

# Copy built application
COPY dist/ ./dist/

# Create data directory
RUN mkdir -p ./data

# Expose the correct port (3000 for Autonia framework)
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]