# Stage 1: build frontend (TypeScript -> dist)
FROM node:alpine AS builder
WORKDIR /app

# Install deps
COPY ./frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci || npm install

# Copy source
WORKDIR /app
COPY shared ./shared
COPY frontend ./frontend

# Compile TS + build CSS
WORKDIR /app/frontend
RUN npm run build
RUN npm run build:css

# Stage 2: serve with Caddy
FROM caddy:alpine

# Copy Caddy config
COPY ./caddy/Caddyfile /etc/caddy/Caddyfile

# Copy static site content (Caddy serves /usr/share/caddy)
WORKDIR /usr/share/caddy
COPY ./frontend/index.html ./index.html
COPY --from=builder /app/frontend/dist ./dist

EXPOSE 80 443
