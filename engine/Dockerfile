FROM node:alpine
WORKDIR /app
COPY ./engine/package*.json ./
RUN npm ci || npm install
COPY ./engine/tsconfig.json ./
COPY ./engine/src ./src
COPY ./shared/Paddle.ts ./src
RUN npm run build
CMD ["node", "dist/index.js"]