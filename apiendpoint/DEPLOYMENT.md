# Deployment Guide - ERP Manufacturing System Backend

## 🚀 Production Deployment Steps

### 1. Server Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Storage**: 50GB minimum
- **Network**: Static IP with ports 80, 443, 3108, 2025 open

### 2. Dependencies Installation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.9+
sudo apt install -y python3 python3-pip python3-venv

# Install MySQL 8.0
sudo apt install -y mysql-server mysql-client

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 3. Database Setup
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p << 'EOF'
CREATE DATABASE topline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'topline_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON topline.* TO 'topline_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Import database schema (upload your schema.sql file)
mysql -u topline_user -p topline < database_schema.sql
```

### 4. Application Deployment
```bash
# Clone repository
git clone https://github.com/paraggi08/backend.git /opt/erp-backend
cd /opt/erp-backend

# Set proper permissions
sudo chown -R www-data:www-data /opt/erp-backend
sudo chmod -R 755 /opt/erp-backend
```

### 5. Command Service Setup (Node.js)
```bash
cd /opt/erp-backend/node

# Install dependencies
npm install --production

# Create production environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3108
DB_HOST=localhost
DB_PORT=3306
DB_NAME=topline
DB_USER=topline_user
DB_PASSWORD=secure_password
JWT_SECRET=your-very-secure-jwt-secret-key-here
JWT_EXPIRATION=24h
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
EOF

# Start with PM2
pm2 start server.js --name "erp-command-service" --env production
```

### 6. Query Service Setup (Python/FastAPI)
```bash
cd /opt/erp-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create production environment file
cat > .env << 'EOF'
ENVIRONMENT=production
API_PORT=2025
COMMAND_PORT=3108
DEBUG=false
DATABASE_URL=mysql+pymysql://topline_user:secure_password@localhost:3306/topline
SECRET_KEY=your-very-secure-secret-key-for-fastapi
CORS_ORIGINS=["https://yourdomain.com"]
EOF

# Start with PM2
pm2 start ecosystem.query.config.js --env production
```

### 7. Nginx Configuration
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/erp-backend << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Command API (Node.js)
    location /api/command/ {
        proxy_pass http://localhost:3108/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Query API (FastAPI)
    location /api/query/ {
        proxy_pass http://localhost:2025/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:2025/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files (if hosting frontend)
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/erp-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL/TLS Setup with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal setup
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 9. Firewall Configuration
```bash
# Configure UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3108/tcp  # Command service (internal)
sudo ufw allow 2025/tcp  # Query service (internal)
sudo ufw status
```

### 10. Process Management
```bash
# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Check status
pm2 status
pm2 logs
```

## 🔧 Monitoring & Maintenance

### Health Checks
```bash
# API health checks
curl -f http://localhost:3108/health || exit 1
curl -f http://localhost:2025/health || exit 1

# Database connection check
mysql -u topline_user -p -e "SELECT 1" topline
```

### Log Management
```bash
# View logs
pm2 logs erp-command-service --lines 100
pm2 logs erp-query-service --lines 100

# Log rotation setup
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Backup Strategy
```bash
# Database backup script
cat > /opt/erp-backend/backup_database.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/erp"
mkdir -p $BACKUP_DIR

mysqldump -u topline_user -p topline > $BACKUP_DIR/topline_backup_$DATE.sql
gzip $BACKUP_DIR/topline_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "topline_backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: topline_backup_$DATE.sql.gz"
EOF

chmod +x /opt/erp-backend/backup_database.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/erp-backend/backup_database.sh
```

### Performance Monitoring
```bash
# Install monitoring tools
sudo npm install -g pm2-server-monit

# System monitoring
pm2 install pm2-server-monit
pm2 monit

# Database performance
mysql -u topline_user -p -e "SHOW PROCESSLIST; SHOW ENGINE INNODB STATUS\G"
```

## 🐛 Troubleshooting

### Service Not Starting
```bash
# Check PM2 status
pm2 status
pm2 logs erp-command-service
pm2 logs erp-query-service

# Restart services
pm2 restart erp-command-service
pm2 restart erp-query-service

# Check ports
netstat -tlnp | grep :3108
netstat -tlnp | grep :2025
```

### Database Connection Issues
```bash
# Test database connection
mysql -u topline_user -p topline -e "SELECT VERSION();"

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### Nginx Issues
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Restart Nginx
sudo systemctl restart nginx
```

## 📊 Performance Optimization

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_part_number ON production_orders(part_number);
CREATE INDEX idx_output_mc_job_order ON output_mc(job_order);
CREATE INDEX idx_oqc_job_order ON oqc(job_order);

-- MySQL configuration optimization (add to /etc/mysql/mysql.conf.d/mysqld.cnf)
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 32M
```

### Node.js Optimization
```javascript
// PM2 cluster mode for Command Service
module.exports = {
  apps: [{
    name: 'erp-command-service',
    script: 'server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3108
    }
  }]
};
```

### Nginx Caching
```nginx
# Add to Nginx configuration
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/query/ {
    proxy_pass http://localhost:2025/;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$request_method$request_uri";
    # ... other proxy settings
}
```

## 🔐 Security Hardening

### System Security
```bash
# Disable root login
sudo passwd -l root

# Setup automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure fail2ban
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security
```bash
# Set proper file permissions
sudo chown -R www-data:www-data /opt/erp-backend
sudo chmod -R 750 /opt/erp-backend
sudo chmod 600 /opt/erp-backend/node/.env
sudo chmod 600 /opt/erp-backend/.env
```

## ✅ Deployment Checklist

- [ ] Server provisioned with required specifications
- [ ] Dependencies installed (Node.js, Python, MySQL, Nginx)
- [ ] Database created and configured
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Services started with PM2
- [ ] Nginx configured and SSL enabled
- [ ] Firewall configured
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] DNS pointed to server
- [ ] Load testing completed
- [ ] Security audit passed

---

**Deployment Date**: September 5, 2025  
**Version**: 2.0.0  
**Environment**: Production Ready ✅
