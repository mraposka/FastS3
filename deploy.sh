#!/bin/bash

# Sabit IP adresi
SERVER_IP="3.145.82.36"
# Gerekli paketlerin kurulumu
sudo apt-get update
sudo apt-get install -y nginx nodejs npm

# Node.js ve npm'i güncelle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2'yi global olarak kur
sudo npm install -g pm2@latest --force

# PM2'nin yolunu bul
PM2_PATH=$(which pm2)
if [ -z "$PM2_PATH" ]; then
    echo "PM2 kurulumu başarısız oldu!"
    exit 1
fi

# Proje dizinini oluştur
PROJECT_DIR="/var/www/events"
sudo mkdir -p $PROJECT_DIR

# Mevcut dizindeki dosyaları proje dizinine kopyala
sudo cp -r /tmp/event-setup/* $PROJECT_DIR/
cd $PROJECT_DIR

# Setup scriptini çalıştır
node setup.js

# Her proje için bağımlılıkları yükle ve PM2 ile başlat
for dir in $PROJECT_DIR/*/ ; do
    if [ -d "$dir" ]; then
        project_name=$(basename "$dir")
        cd "$dir"
        echo "Installing dependencies for $project_name..."
        npm install
        if [ $? -ne 0 ]; then
            echo "Failed to install dependencies for $project_name"
            exit 1
        fi
    fi
done

# Nginx yapılandırması
NGINX_CONF="/etc/nginx/sites-available/events"
sudo tee $NGINX_CONF > /dev/null << EOL
server {
    listen 80;
    server_name 3.145.82.36;

    client_max_body_size 100M;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
    send_timeout 300;

    # Proje-spesifik yönlendirmeler
    location ~ ^/([^/]+)(/.*)?$ {
        set \$project_name \$1;
        proxy_pass http://127.0.0.1:5000\$2;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Event-Name \$project_name;
    }

    # Ana dizin için 404
    location = / {
        return 404;
    }
}
EOL

# Nginx yapılandırmasını etkinleştir
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# PM2 ile uygulamayı başlat
echo "Starting application with PM2..."
pm2 delete all || true
pm2 flush

# Her proje için PM2 yapılandırması
for dir in $PROJECT_DIR/*/ ; do
    if [ -d "$dir" ]; then
        project_name=$(basename "$dir")
        cd "$dir"
        echo "Starting $project_name with PM2..."
        pm2 start server.js --name "$project_name" --time
    fi
done

pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu


echo "Deployment tamamlandı! Projeler şu URL'lerden erişilebilir:"
for dir in $PROJECT_DIR/*/ ; do
    if [ -d "$dir" ]; then
        project_name=$(basename "$dir")
        echo "http://$SERVER_IP/$project_name"
    fi
done

# Log dosyalarını göster
echo -e "\nNginx error log:"
sudo tail -n 20 /var/log/nginx/error.log

echo -e "\nPM2 logs:"
$PM2_PATH logs --lines 20 