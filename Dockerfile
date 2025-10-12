# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

# Only copy what is needed to install and build
COPY package*.json ./
RUN npm ci || npm i

COPY tsconfig.json ./
COPY src/ ./src

# Build to dist/ per tsconfig.json
RUN npx tsc

# Stage 2: Serve with nginx (HTTPS only)
FROM nginx:alpine

# Generate self-signed cert
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=XX/ST=STATE/L=CITY/O=ORGANIZATION/OU=UNIT/CN=tgroeppm.42.fr"

# Remove default HTTP vhost; we’ll use our own nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Only copy the runtime assets
COPY index.html ./
COPY style.css ./
COPY --from=builder /app/dist ./dist
COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 443
RUN chmod -R 755 /usr/share/nginx/html