FROM node:alpine

WORKDIR /app

# Install build tools for sqlite3
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/backend.js"]