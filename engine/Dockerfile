FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc -p tsconfig.json
CMD ["node", "dist/index.js"]