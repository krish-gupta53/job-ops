FROM python:3.11-slim

WORKDIR /app

# Install Chromium system dependencies manually.
# playwright install-deps is broken on Debian Trixie (python:3.11-slim uses trixie)
# because ttf-unifont and ttf-ubuntu-font-family packages were renamed/removed.
# Installing deps explicitly is the correct Docker pattern anyway.
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core browser runtime
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    # Fonts — use the Trixie-compatible package names
    fonts-liberation \
    fonts-unifont \
    # Utility
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright's Chromium binary (no install-deps needed — we handled it above)
RUN playwright install chromium

COPY . .

# Create data directories
RUN mkdir -p data output/resumes output/reports

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
