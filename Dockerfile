# syntax=docker/dockerfile:1

# --- Stage 1: build the frontend static assets ---
FROM node:22-alpine AS frontend-build

WORKDIR /frontend

# Install dependencies first to leverage Docker layer caching.
COPY frontend/package*.json ./
RUN npm ci

# Build against the same origin: empty base URL → relative API paths.
ENV VITE_API_BASE_URL=""

COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend runtime serving the API and the built frontend ---
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install Python dependencies first to leverage Docker layer caching.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend application code.
COPY backend/ ./

# Built frontend static assets from the build stage.
COPY --from=frontend-build /frontend/dist /app/frontend_dist

ENV FRONTEND_DIST=/app/frontend_dist
ENV PORT=8000

EXPOSE 8000

# Shell form so ${PORT} is expanded at runtime; the platform may inject PORT.
# `exec` replaces the shell with uvicorn so it runs as PID 1 and receives
# SIGTERM from `docker stop`/the host platform, enabling graceful shutdown.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
