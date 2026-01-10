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

# Inject environment variables into HTML files
# Note: Environment variables will be injected at runtime via entrypoint script
# For now, we'll use a build-time replacement if GOOGLE_CLIENT_ID is available
ARG GOOGLE_CLIENT_ID=""
RUN if [ -n "$GOOGLE_CLIENT_ID" ]; then \
      find . -name "*.html" -type f -exec sed -i "s|{{GOOGLE_CLIENT_ID}}|${GOOGLE_CLIENT_ID}|g" {} \; ; \
    fi

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy application files from builder
COPY --from=builder /app .

# Copy environment injection script
COPY docker/inject-env.sh /inject-env.sh
RUN chmod +x /inject-env.sh

# Create non-root user (check if group/user already exists)
RUN (getent group 1000 >/dev/null 2>&1 || addgroup -g 1000 appuser) && \
    (getent passwd 1000 >/dev/null 2>&1 || adduser -D -u 1000 -G appuser appuser) && \
    (getent group appuser >/dev/null 2>&1 || addgroup appuser) && \
    (getent passwd appuser >/dev/null 2>&1 || adduser -D -u 1000 -G appuser appuser)

# Set ownership
RUN chown -R appuser:appuser /app /inject-env.sh

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server with environment variable injection
ENTRYPOINT ["/inject-env.sh"]

