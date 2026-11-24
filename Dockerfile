# ===================================================
# Stage 1: Build React Frontend
# ===================================================
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ===================================================
# Stage 2: Production Node.js Server & Static Host
# ===================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install server production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server application
COPY server/ ./server/

# Copy built frontend assets from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Expose backend/frontend single port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/db || exit 0

# Start server
CMD ["node", "server/index.js"]
