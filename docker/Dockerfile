# Multi-stage build for ThinkCNAP app
# This Dockerfile expects the think-cnap-app source to be in ./app directory
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from app source
COPY app/package*.json ./

# Install dependencies (if any)
RUN npm ci --only=production || true

# Copy application files from app source
COPY app/ .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy application files from builder
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["serve", "-s", ".", "-l", "8080"]

