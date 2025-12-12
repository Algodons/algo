# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built files
COPY --from=builder /app/frontend/package*.json ./
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
