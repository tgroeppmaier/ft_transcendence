FROM node:alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/backend.js"]