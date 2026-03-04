# ── Stage 1: Build React dashboard ──────────────────────────────────────────
FROM node:20-slim AS frontend

WORKDIR /dashboard
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ ./
# VITE_API_URL is injected at runtime via window.__GALUI_API_URL__ instead
# so we don't need it at build time
RUN npm run build

# ── Stage 2: Python backend ───────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy built dashboard into static/dashboard/
COPY --from=frontend /dashboard/dist ./static/dashboard

# Ensure data directory exists for SQLite
RUN mkdir -p data

# Run as non-root for least-privilege (SOC 2 CC6.2)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

ENV PORT=8000
EXPOSE ${PORT}

CMD uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT}
