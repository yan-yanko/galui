FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p data

ENV PORT=8000
EXPOSE ${PORT}

CMD uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT}
