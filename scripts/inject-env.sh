#!/bin/sh
# Script to inject environment variables into HTML files at runtime
# This is called by the container entrypoint

# Empty GOOGLE_CLIENT_ID disables Google Sign-In
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"

# Replace placeholders in HTML files (Alpine Linux compatible)
# Use a temporary file approach for busybox sed
find /app/public -name "*.html" -type f | while read file; do
  sed "s|{{GOOGLE_CLIENT_ID}}|${GOOGLE_CLIENT_ID}|g" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Start the server (API + static files); pending DB migrations are applied on start
exec node /app/server.js
