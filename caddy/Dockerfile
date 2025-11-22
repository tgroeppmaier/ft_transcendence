# Stage 1: build frontend
FROM node:20-alpine AS builder
WORKDIR /app/frontend

# Обновим npm до последней версии 11.x
RUN npm install -g npm@11

# Копируем зависимости
COPY ./frontend/package*.json ./

# Устанавливаем зависимости чисто
RUN npm install

# Копируем исходники
COPY ./frontend/tsconfig.json ./tsconfig.json
COPY ./frontend/tailwind.config.js ./tailwind.config.js
COPY ./frontend/index.html ./index.html
COPY ./frontend/src ./src

# Собираем CSS и TypeScript
RUN npm run build:css && npm run build

# Stage 2: serve with Caddy
FROM caddy:alpine
WORKDIR /usr/share/caddy

# Caddy config
COPY ./caddy/Caddyfile /etc/caddy/Caddyfile

# Копируем готовый фронтенд из builder stage
COPY --from=builder /app/frontend/dist ./dist
COPY --from=builder /app/frontend/index.html ./index.html

EXPOSE 80 443

