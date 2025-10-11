# Uses Playwright’s official image with all browser deps
FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app

# Install prod deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy app code
COPY . .

# Tell Playwright to use the preinstalled browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# (Render sets PORT; default to 8080)
ENV PORT=8080
EXPOSE 8080

# Run migrations then start server
CMD ["bash", "-lc", "node scripts/migrate.js && node server.js"]