# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build with placeholder values that will be replaced at runtime
ENV VITE_API_URL=VITE_API_URL_PLACEHOLDER
ENV VITE_AUTH_API_URL=VITE_AUTH_API_URL_PLACEHOLDER
ENV VITE_WS_URL=VITE_WS_URL_PLACEHOLDER
ENV VITE_EVOAI_API_URL=VITE_EVOAI_API_URL_PLACEHOLDER
ENV VITE_AGENT_PROCESSOR_URL=VITE_AGENT_PROCESSOR_URL_PLACEHOLDER
ENV VITE_EVOFLOW_API_URL=VITE_EVOFLOW_API_URL_PLACEHOLDER

# App version (release tag, e.g. v1.0.0-rc3). Pass via:
#   docker build --build-arg APP_VERSION=$(git describe --tags --always --dirty) ...
# The .git directory is not copied into the build context, so vite.config.ts
# cannot run `git describe` from inside the container — the build-arg is the
# only signal. Falls back to 'dev' if not provided.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy runtime entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
