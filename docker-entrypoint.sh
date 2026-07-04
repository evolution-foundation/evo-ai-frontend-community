#!/bin/sh
set -e

# =============================================================================
# Runtime environment variable injection for Vite-built apps
# =============================================================================
# Replaces placeholder values in the built JS files with actual environment
# variables at container startup, enabling runtime configuration without
# rebuilding the image.
# =============================================================================

HTML_DIR="/usr/share/nginx/html"

# Replace VITE_* variables in all JS files
# The build uses empty strings or defaults — we replace them at runtime
for file in $(find "$HTML_DIR" -name '*.js' -type f); do
  # Replace each VITE_* env var if set
  [ -n "$VITE_API_URL" ] && sed -i "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL}|g" "$file"
  [ -n "$VITE_AUTH_API_URL" ] && sed -i "s|VITE_AUTH_API_URL_PLACEHOLDER|${VITE_AUTH_API_URL}|g" "$file"
  [ -n "$VITE_WS_URL" ] && sed -i "s|VITE_WS_URL_PLACEHOLDER|${VITE_WS_URL}|g" "$file"
  [ -n "$VITE_EVOAI_API_URL" ] && sed -i "s|VITE_EVOAI_API_URL_PLACEHOLDER|${VITE_EVOAI_API_URL}|g" "$file"
  [ -n "$VITE_AGENT_PROCESSOR_URL" ] && sed -i "s|VITE_AGENT_PROCESSOR_URL_PLACEHOLDER|${VITE_AGENT_PROCESSOR_URL}|g" "$file"
done

# Configure nginx CSP based on environment (default: development)
APP_ENV="${VITE_APP_ENV:-development}"

if [ "$APP_ENV" = "development" ]; then
  # Development: Allow localhost connections and permissive frame-ancestors for widget
  sed -i "s|connect-src 'self' blob: https: wss: ws:|connect-src 'self' blob: https: wss: ws: http://localhost:*|g" /etc/nginx/conf.d/default.conf
  sed -i "s|frame-ancestors 'self'|frame-ancestors *|g" /etc/nginx/conf.d/default.conf
fi


exec "$@"
