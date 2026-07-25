FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

RUN apt-get update \
    && apt-get install -y --no-install-recommends cron tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app/backend
COPY docker/cron/findex-cron /etc/cron.d/findex-cron
COPY docker/cron/entrypoint.sh /entrypoint.sh

RUN chmod 0644 /etc/cron.d/findex-cron \
    && chmod +x /entrypoint.sh \
    && crontab /etc/cron.d/findex-cron

ENTRYPOINT ["/entrypoint.sh"]
