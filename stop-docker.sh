#!/bin/bash

# FIS-Learn Docker Stop Script

set -e

echo "🛑 Stopping FIS-Learn Platform..."
echo "=============================================="

docker compose -f docker-compose.production.yml down

echo ""
echo "✅ All services stopped!"
echo ""
echo "To remove volumes (database data) as well, run:"
echo "   docker compose -f docker-compose.production.yml down -v"
echo ""
