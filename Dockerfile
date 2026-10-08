# Build the frontend
FROM node:22-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx vite build

# Run the backend, serving the built frontend as static files
FROM python:3.10-slim
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app backend/app
COPY --from=frontend /src/frontend/dist frontend/dist

EXPOSE 8001
CMD ["sh", "-c", "uvicorn app.main:create_app --factory --app-dir backend --host 0.0.0.0 --port ${PORT:-8001}"]
