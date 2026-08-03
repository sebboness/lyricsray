#!/bin/bash
trap 'kill 0' EXIT

clear

API_PORT=12099
WEB_PORT=2099
API_HEALTH_URL="http://localhost:${API_PORT}/v1/health"

kill -9 $(lsof -t -i:${WEB_PORT}) 2>/dev/null
kill -9 $(lsof -t -i:${API_PORT}) 2>/dev/null

(cd api && npm run dev) &

echo "Waiting for API server on port ${API_PORT}..."
for i in $(seq 1 60); do
  if curl -sf "${API_HEALTH_URL}" > /dev/null 2>&1; then
    echo "API server is up."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "API server did not become healthy in time; starting web anyway."
  fi
  sleep 1
done

(cd web && npm run dev) &

wait
