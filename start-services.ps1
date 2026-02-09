# FIS-Learn Services Startup Script
# This script starts all Docker services for the FIS-Learn platform

Write-Host "🚀 FIS-Learn Platform - Starting All Services" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "📋 Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker info | Out-Null
    $dockerRunning = $true
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and wait for it to fully start." -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
Write-Host ""
Write-Host "📋 Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please edit .env and set the required values:" -ForegroundColor Yellow
    Write-Host "  - POSTGRES_PASSWORD" -ForegroundColor Yellow
    Write-Host "  - REDIS_PASSWORD" -ForegroundColor Yellow
    Write-Host "  - JWT_SECRET" -ForegroundColor Yellow
    Write-Host "  - JWT_REFRESH_SECRET" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# Stop existing containers
Write-Host ""
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "✓ Stopped existing containers" -ForegroundColor Green

# Start services
Write-Host ""
Write-Host "🚀 Starting all services..." -ForegroundColor Yellow
Write-Host ""

docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "📊 Service URLs:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "🌐 Admin Dashboard:  http://localhost:3004" -ForegroundColor White
    Write-Host "🌐 Student Portal:   http://localhost:3010" -ForegroundColor White
    Write-Host "🔌 API:              http://localhost:3011" -ForegroundColor White
    Write-Host "🔀 Nginx Proxy:      http://localhost:80" -ForegroundColor White
    Write-Host "🗄️  PostgreSQL:       localhost:5432" -ForegroundColor White
    Write-Host "💾 Redis:            localhost:6379" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Checking service status..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    docker-compose ps
    Write-Host ""
    Write-Host "✅ All services are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Gray
    Write-Host "To stop:      docker-compose down" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Missing required environment variables in .env" -ForegroundColor Yellow
    Write-Host "  2. Ports already in use (check if services are already running)" -ForegroundColor Yellow
    Write-Host "  3. Docker daemon not fully started" -ForegroundColor Yellow
    exit 1
}
