#!/bin/sh
# Script to inject environment variables into HTML files at runtime
# This is called by the container entrypoint

GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-314381672297-eu9jidtaeil3404mbfv11031jncugv8q.apps.googleusercontent.com}"

# Replace placeholders in HTML files (Alpine Linux compatible)
# Use a temporary file approach for busybox sed
find /app -name "*.html" -type f | while read file; do
  sed "s|{{GOOGLE_CLIENT_ID}}|${GOOGLE_CLIENT_ID}|g" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Start the server
exec serve -s /app -l 8080
