FROM alpine:3.18
WORKDIR /app
RUN apk add --no-cache nodejs npm sqlite sqlite-dev bash

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/data /app/uploads

# Создаем entrypoint скрипт правильно
RUN printf '#!/bin/bash\nif [ ! -f /app/data/users.db ]; then\n  echo "Initializing database..."\n  node /app/init-db.js\nfi\nexec node /app/server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
