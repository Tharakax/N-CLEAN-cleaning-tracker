# Multi-stage Docker build for N-CLEAN Cleaning Tracker

# ── Stage 1: Build Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Install server production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server code
COPY server/ ./server/

# Copy built client bundle into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/src/index.js"]
