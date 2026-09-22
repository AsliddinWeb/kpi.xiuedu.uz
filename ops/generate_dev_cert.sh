#!/usr/bin/env bash
# Generates a self-signed TLS cert for locally testing docker-compose.prod.yml.
# In real production, replace nginx/certs/*.pem with certs from a real CA
# (e.g. Let's Encrypt / certbot) for the actual domain.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$(dirname "$SCRIPT_DIR")/nginx/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=localhost"

echo "Sertifikat yaratildi: $CERT_DIR"
