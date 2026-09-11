# The API image. Build context is the repository root (docker-compose.yml sets
# it) so the whole sourcebook package is copied in. The web app has its
# own Dockerfile under web/.

FROM python:3.14-slim

WORKDIR /app

# Dependencies first — cached layer, rebuilt only when requirements change
COPY requirements/api.txt requirements/
RUN pip install --no-cache-dir -r requirements/api.txt

COPY sourcebook/ sourcebook/

EXPOSE 8000

# --proxy-headers lets uvicorn honour X-Forwarded-* from a trusted peer so the
# rate limiter and failed-login log see the external client Nginx resolved,
# not Nginx's own container IP. Trust is NOT "*": uvicorn reads
# FORWARDED_ALLOW_IPS (Compose sets it to Docker's 172.16.0.0/12 and 192.168.0.0/16 pools).
# A bare local `uvicorn` without that env trusts only 127.0.0.1.
CMD ["uvicorn", "sourcebook.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
