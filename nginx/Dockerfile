# Stage 1: Build TypeScript
FROM node:alpine AS builder
WORKDIR /app

# Only what's needed to install and build
COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend/tsconfig.json ./
COPY ./frontend/src/ ./src

# Build to dist/ per tsconfig.json
RUN npx tsc

# Stage 2: Serve with nginx (HTTPS)
FROM nginx:alpine

# Generate self-signed cert
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=XX/ST=STATE/L=CITY/O=ORGANIZATION/OU=UNIT/CN=tgroeppm.42.fr"

# Remove default HTTP vhost; we'll use our own nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Only copy the runtime assets
COPY --chown=nginx:nginx ./frontend/index.html ./
COPY --chown=nginx:nginx ./frontend/src/style.css ./style.css
COPY --chown=nginx:nginx --from=builder /app/dist ./dist
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 443 80