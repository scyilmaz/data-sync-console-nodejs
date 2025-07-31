#!/bin/bash

# deployment-scripts/linux-setup.sh
# Linux sunucusu için otomatik kurulum scripti

set -e

echo "🚀 Data Sync Console Linux Deployment Başlatılıyor..."

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonksiyonlar
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    print_warning "Node.js bulunamadı. Kurulum yapılıyor..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js kuruldu"
else
    print_success "Node.js zaten kurulu: $(node --version)"
fi

# Proje dizini
PROJECT_DIR="/home/$(whoami)/data-sync-console-nodejs"

# Proje klonlama veya güncelleme
if [ -d "$PROJECT_DIR" ]; then
    print_warning "Proje dizini mevcut. Güncelleniyor..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    print_warning "Proje klonlanıyor..."
    git clone https://github.com/scyilmaz/data-sync-console-nodejs.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Bağımlılıkları yükle
print_warning "NPM paketleri yükleniyor..."
npm install --production
print_success "NPM paketleri yüklendi"

# Environment dosyası kontrolü
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning ".env dosyası oluşturuldu. Lütfen düzenleyin:"
    echo "nano $PROJECT_DIR/.env"
else
    print_success ".env dosyası mevcut"
fi

# Log dizini oluştur
mkdir -p logs
print_success "Log dizini oluşturuldu"

# Systemd service oluştur
SERVICE_FILE="/etc/systemd/system/data-sync.service"
TIMER_FILE="/etc/systemd/system/data-sync.timer"

print_warning "Systemd servisleri oluşturuluyor..."

# Service dosyası
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Data Sync Console Node.js
After=network.target

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node src/app.js
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Timer dosyası (her 5 dakikada)
sudo tee "$TIMER_FILE" > /dev/null <<EOF
[Unit]
Description=Run Data Sync every 5 minutes
Requires=data-sync.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Servisleri etkinleştir
sudo systemctl daemon-reload
sudo systemctl enable data-sync.timer
sudo systemctl start data-sync.timer

print_success "Systemd servisleri oluşturuldu ve başlatıldı"

# Durum kontrolü
echo ""
print_success "Kurulum tamamlandı! 🎉"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. Environment dosyasını düzenleyin: nano $PROJECT_DIR/.env"
echo "2. Bağlantıları test edin: cd $PROJECT_DIR && npm start test"
echo "3. Timer durumunu kontrol edin: sudo systemctl status data-sync.timer"
echo "4. Logları izleyin: tail -f $PROJECT_DIR/logs/data-sync-console.log"
echo ""
echo "🔧 Yönetim komutları:"
echo "- Timer durumu: sudo systemctl status data-sync.timer"
echo "- Timer durdur: sudo systemctl stop data-sync.timer"
echo "- Timer başlat: sudo systemctl start data-sync.timer"
echo "- Logları görüntüle: sudo journalctl -u data-sync.service -f"
echo ""
print_warning "Timer şu anda her 5 dakikada bir çalışacak şekilde ayarlandı."
