# ---- Build/deps stage ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- Runtime stage ----
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# Run as non-root for security
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app . .
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1
CMD ["node", "src/server.js"]
