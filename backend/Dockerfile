FROM node:alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci || npm install

# Go back to root to copy source files
WORKDIR /app
COPY shared ./shared
COPY backend ./backend

# Build backend
WORKDIR /app/backend
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/backend/src/backend.js"]
