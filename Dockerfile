# Uses Playwright’s official image with all browser deps
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Install prod deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy app code
COPY . .

# (Render sets PORT; default to 8080)
ENV PORT=8080
EXPOSE 8080

# Run migrations then start server
CMD ["bash", "-lc", "node scripts/migrate.js && node server.js"]
