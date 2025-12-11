# Multi-stage build for Homesfy Chat Buddy
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/dashboard/package*.json ./apps/dashboard/
COPY apps/widget/package*.json ./apps/widget/

# Install dependencies
RUN npm install
RUN cd apps/api && npm install
RUN cd apps/dashboard && npm install
RUN cd apps/widget && npm install

# Copy source code
COPY . .

# Build applications
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install only production dependencies for API
RUN npm install --production
RUN cd apps/api && npm install --production

# Copy built files and source
COPY --from=builder /app/apps/dashboard/dist ./apps/dashboard/dist
COPY --from=builder /app/apps/widget/dist ./apps/widget/dist
COPY apps/api ./apps/api

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start API server
CMD ["node", "apps/api/src/server.js"]

