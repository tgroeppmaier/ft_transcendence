# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g typescript@5.6.3
RUN if [ -f tsconfig.json ]; then tsc; else tsc script.ts; fi

# Stage 2: Serve with nginx (HTTPS only)
FROM nginx:alpine
# openssl to generate the cert
RUN apk add --no-cache openssl
RUN mkdir -p /etc/nginx/ssl

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=XX/ST=STATE/L=CITY/O=ORGANIZATION/OU=UNIT/CN=tgroeppm.42.fr"

# Remove default HTTP vhost to avoid port 80
RUN rm -f /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
# Copy only necessary files from the builder stage
COPY --from=builder /app/index.html ./
COPY --from=builder /app/script.js ./
COPY --from=builder /app/style.css ./
# Your nginx.conf must listen on 443 ssl and reference the cert/key above
COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 443
RUN chmod -R 755 /usr/share/nginx/html