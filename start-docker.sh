#!/bin/bash

# FIS-Learn Docker Startup Script
# This script starts all services using Docker Compose
# Modified ports to avoid conflicts with existing projects

set -e

echo "🚀 Starting FIS-Learn Platform with Docker..."
echo "=============================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please ensure .env file exists with all required variables"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again"
    exit 1
fi

echo ""
echo "📦 Building Docker images..."
echo "This may take a few minutes on first run..."
docker compose -f docker-compose.production.yml build

echo ""
echo "🐳 Starting Docker containers..."
docker compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Wait for PostgreSQL to be healthy
MAX_ATTEMPTS=30
ATTEMPT=0
until docker exec fis-postgres pg_isready -U postgres > /dev/null 2>&1 || [ $ATTEMPT -eq $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    echo "Waiting for PostgreSQL... (Attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Error: PostgreSQL failed to start"
    exit 1
fi

echo "✅ PostgreSQL is ready!"

echo ""
echo "🔄 Running database migrations..."
# Run migrations inside the API container
docker exec fis-api sh -c "cd apps/api && npx prisma migrate deploy"

echo ""
echo "🌱 Seeding database (optional)..."
# Ask user if they want to seed the database
read -p "Do you want to seed the database with test data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker exec fis-api sh -c "cd apps/api && npx prisma db seed"
    echo "✅ Database seeded successfully!"
fi

echo ""
echo "=============================================="
echo "🎉 FIS-Learn Platform is now running!"
echo "=============================================="
echo ""
echo "📍 Access URLs:"
echo "   • Admin Dashboard: http://localhost:3004"
echo "   • Student Portal:  http://localhost:3010"
echo "   • API Backend:     http://localhost:3011/api/v1"
echo "   • Nginx Proxy:     http://localhost:8080"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Admin:"
echo "     Email: admin@fis-learn.com"
echo "     Password: Admin123!"
echo ""
echo "   Student:"
echo "     Email: student@fis-learn.com"
echo "     Password: Student123!"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs:        docker compose -f docker-compose.production.yml logs -f"
echo "   • Stop services:    docker compose -f docker-compose.production.yml down"
echo "   • Restart services: docker compose -f docker-compose.production.yml restart"
echo "   • View status:      docker compose -f docker-compose.production.yml ps"
echo ""
echo "📝 Note: Services use ports 3004, 3010, 3011, 5432, 6380, 8080"
echo "     (Modified to avoid conflicts with existing projects)"
echo ""
