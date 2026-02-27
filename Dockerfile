# ============ Stage 1: Build Frontend ============
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ============ Stage 2: Python Runtime ============
FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/static

RUN mkdir -p /app/data

ENV DATABASE_URL="sqlite:///./data/budgetbolt.db"
ENV PYTHONPATH="/app"

EXPOSE 5000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
