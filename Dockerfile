# Singbox Manager - Docker Image
# Multi-stage build for minimal image size

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

LABEL maintainer="Singbox Manager"
LABEL description="Professional Sing-box server manager with VLESS+Reality support"

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tar \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create config directory
RUN mkdir -p /etc/singbox-manager

# Set environment variables
ENV NODE_ENV=production
ENV CONFIG_PATH=/etc/singbox-manager/config.json
ENV STATE_PATH=/etc/singbox-manager/state.json

# Expose default port
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f sing-box || exit 1

# Entry point
ENTRYPOINT ["node", "dist/index.js"]
CMD ["status"]
