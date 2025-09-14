# Build frontend
FROM node:20 AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend
FROM node:20-slim
WORKDIR /app
COPY backend/package*.json backend/
RUN cd backend && npm install --production
COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist
WORKDIR /app/backend
ENV NODE_ENV=production
CMD ["node", "server.js"]
