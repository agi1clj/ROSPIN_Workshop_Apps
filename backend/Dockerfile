# Backend image: FastAPI served by Uvicorn on port 8000.
FROM python:3.13-slim

# Do not write .pyc files and flush logs immediately (visible in the Container Apps log stream).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System library required by rasterio (reads the Sentinel-2 files).
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first so this layer is cached when only the code changes.
COPY requirements.txt .
# pip is removed afterwards: the running container never needs it (smaller attack surface).
RUN pip install -r requirements.txt && pip uninstall -y pip

COPY app/ ./app/

# The Git commit SHA is passed by CI and reported by GET /health.
ARG APP_VERSION=local
ENV APP_VERSION=${APP_VERSION}

# Run as an unprivileged user instead of root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
