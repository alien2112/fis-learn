# FIS-Learn Docker Setup Guide

## 🐳 Quick Start

This project has been configured to run with Docker on your VPS without conflicting with your existing project.

### Port Configuration (Modified)

The following ports have been adjusted to avoid conflicts:

| Service | Original Port | New Port | Purpose |
|---------|--------------|----------|---------|
| Nginx | 80 | **8080** | Reverse proxy |
| Redis | 6379 | **6380** | Cache (external access) |
| PostgreSQL | 5432 | 5432 | Database |
| API | 3011 | 3011 | Backend API |
| Admin | 3004 | 3004 | Admin Dashboard |
| Web | 3010 | 3010 | Student Portal |

## 🚀 Starting the Services

```bash
# Navigate to project directory
cd /var/www/fis-academy/fis-learn

# Start all services
./start-docker.sh
```

The script will:
1. ✅ Build Docker images
2. ✅ Start all containers
3. ✅ Run database migrations
4. ✅ Optionally seed test data

## 🛑 Stopping the Services

```bash
# Stop all services
./stop-docker.sh

# Stop and remove all data (including database)
docker compose -f docker-compose.production.yml down -v
```

## 📊 Managing Services

### View Running Containers
```bash
docker compose -f docker-compose.production.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f api
docker compose -f docker-compose.production.yml logs -f web
docker compose -f docker-compose.production.yml logs -f admin
docker compose -f docker-compose.production.yml logs -f postgres
docker compose -f docker-compose.production.yml logs -f redis
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.production.yml restart

# Restart specific service
docker compose -f docker-compose.production.yml restart api
```

### Access Container Shell
```bash
# API container
docker exec -it fis-api sh

# PostgreSQL
docker exec -it fis-postgres psql -U postgres -d fis_learn
```

## 🔧 Database Operations

### Run Migrations
```bash
docker exec fis-api sh -c "cd apps/api && npx prisma migrate deploy"
```

### Seed Database
```bash
docker exec fis-api sh -c "cd apps/api && npx prisma db seed"
```

### Prisma Studio (Database GUI)
```bash
# This won't work inside Docker, use a local connection instead
# Or connect using a database client to: localhost:5432
```

### Database Backup
```bash
# Create backup
docker exec fis-postgres pg_dump -U postgres fis_learn > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup_file.sql | docker exec -i fis-postgres psql -U postgres -d fis_learn
```

## 🌐 Access URLs

After starting, access the platform at:

- **Admin Dashboard**: http://YOUR_VPS_IP:3004
- **Student Portal**: http://YOUR_VPS_IP:3010
- **API**: http://YOUR_VPS_IP:3011/api/v1
- **Nginx Proxy**: http://YOUR_VPS_IP:8080

## 🔐 Default Credentials

### Admin Account
```
Email: admin@fis-learn.com
Password: Admin123!
```

### Student Account
```
Email: student@fis-learn.com
Password: Student123!
```

### Instructor Account
```
Email: instructor@fis-learn.com
Password: Instructor123!
```

## 🔒 Security Notes

1. **Generated Secrets**: All JWT secrets and passwords have been randomly generated in `.env`
2. **PostgreSQL Password**: Stored in `.env` as `POSTGRES_PASSWORD`
3. **Redis Password**: Stored in `.env` as `REDIS_PASSWORD`
4. **Change Default Accounts**: After first login, change all default passwords!

## 🐛 Troubleshooting

### Containers Won't Start
```bash
# Check if ports are in use
ss -tulpn | grep -E ':(3004|3010|3011|5432|6380|8080)'

# View detailed logs
docker compose -f docker-compose.production.yml logs
```

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker exec fis-postgres pg_isready -U postgres

# Reset database
docker compose -f docker-compose.production.yml down -v
./start-docker.sh
```

### Migration Errors
```bash
# Reset Prisma migrations
docker exec fis-api sh -c "cd apps/api && npx prisma migrate reset --force"
```

### Clear and Rebuild
```bash
# Stop everything
docker compose -f docker-compose.production.yml down -v

# Remove images
docker rmi fis-learn-api fis-learn-web fis-learn-admin

# Rebuild and start
./start-docker.sh
```

## 📈 Monitoring

### Check Resource Usage
```bash
docker stats
```

### Check Disk Space
```bash
docker system df
```

### Clean Up Unused Resources
```bash
# Remove unused containers, networks, images
docker system prune -a

# Remove unused volumes (BE CAREFUL - this deletes data!)
docker volume prune
```

## 🔄 Updates

### Pull Latest Code
```bash
cd /var/www/fis-academy/fis-learn
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build
```

### Update Dependencies
```bash
# Rebuild images with --no-cache
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d
```

## 📝 Environment Variables

All configuration is stored in `.env` file. Key variables:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=fis_learn

# Redis
REDIS_PASSWORD=<generated>

# JWT
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
```

## 🌐 Production Deployment

For production deployment with a domain name:

1. Update nginx configuration to use your domain
2. Set up SSL certificates (Let's Encrypt)
3. Configure firewall rules
4. Set up monitoring and backups
5. Review `PRODUCTION_READINESS_AUDIT_2026-02-07.md`

## 📞 Support

For issues or questions:
- Check logs: `docker compose -f docker-compose.production.yml logs -f`
- Review documentation files in project root
- Check GitHub issues: https://github.com/alien2112/fis-learn/issues

---

**Last Updated**: February 10, 2026
**Docker Version**: 29.1.3
**Docker Compose Version**: 5.0.0
