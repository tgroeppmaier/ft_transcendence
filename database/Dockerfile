FROM alpine:3.18
WORKDIR /app
RUN apk add --no-cache nodejs npm sqlite sqlite-dev bash vips-dev build-base

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/data /app/uploads

# Создаем entrypoint скрипт правильно
RUN printf '#!/bin/bash\nif [ ! -f /app/data/users.db ]; then\n  echo "Initializing database..."\n  npx tsx /app/init-db.ts\nfi\nexec npx tsx /app/server.ts\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
