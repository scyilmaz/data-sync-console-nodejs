# Data Sync Console Node.js

Yerel ve bulut veritabanları arasında otomatik veri senkronizasyonu sağlayan Node.js uygulaması.

## 🔒 Güvenlik Notları

⚠️ **UYARI**: Gerçek veritabanı bilgilerini asla kaynak koda yazmayın!

- Tüm hassas bilgiler `.env` dosyasında tutulur
- `.env` dosyası git'e dahil edilmez

## 🚀 Özellikler

- ✅ **14 Farklı Tablo Senkronizasyonu**: Firmalar, Personel, Stok verileri ve daha fazlası
- ✅ **Otomatik Scheduler**: Windows Task Scheduler ve Linux Cron desteği
- ✅ **Email Bildirimleri**: Başarı/hata durumlarında otomatik bildirim
- ✅ **Güvenli Yapılandırma**: Environment variables ile şifre koruması
- ✅ **Detaylı Loglama**: Winston ile kapsamlı log sistemi
- ✅ **Cross-Platform**: Windows, Linux, Docker desteği

## 📊 Senkronize Edilen Tablolar

| Modül      | Açıklama                      |
| ---------- | ----------------------------- |
| Entities   | Kuruluşlar/Firmalar           |
| Users      | Kullanıcılar/Personel         |
| Stock      | Kategoriler, Kalite, Kartlar  |
| Design     | Kartlar, Varyantlar, İplikler |
| Production | Rotalama, Kalite Kontrol      |
| Operations | İş Emirleri, Stoklar          |
| Systems    | UH, MS Kayıtları              |

## ⚡ Hızlı Kurulum

### 1. Projeyi İndirin

```bash
git clone https://github.com/scyilmaz/data-sync-console-nodejs.git
cd data-sync-console-nodejs
```

### 2. Ortama Göre Kurulum

**Windows (Otomatik):**

```powershell
# PowerShell'i Admin olarak açın
.\deployment-scripts\windows-setup.ps1
```

**Linux (Otomatik):**

```bash
sudo ./deployment-scripts/linux-setup.sh
```

**Manuel Kurulum:**

```bash
npm install
cp .env.example .env
# .env dosyasını düzenleyin
```

### 3. Yapılandırma

`.env` dosyasında veritabanı bilgilerinizi güncelleyin:

```env
# Yerel Veritabanı
DB_LOCAL_SERVER=localhost
DB_LOCAL_DATABASE=your_database
DB_LOCAL_USER=your_user
DB_LOCAL_PASSWORD=your_password

# Bulut Veritabanı
DB_CLOUD_SERVER=your_server.database.windows.net
DB_CLOUD_DATABASE=your_cloud_db
DB_CLOUD_USER=your_cloud_user
DB_CLOUD_PASSWORD=your_cloud_password

# Email Ayarları
EMAIL_SMTP_USER=notifications@company.com
EMAIL_SMTP_PASSWORD=your_app_password
EMAIL_ERROR_RECIPIENTS=admin@company.com
```

### 4. Test ve Çalıştırma

```bash
# Bağlantı testi
npm start test

# Tek seferlik senkronizasyon
npm start

# Development modu
npm run dev
```

## 🔄 Scheduler Kurulumu

### Windows Task Scheduler

Otomatik kurulum scripti Task Scheduler'ı ayarlar. Her 5 dakikada bir çalışır.

### Linux Cron

```bash
# Cron job eklemek için
crontab -e

# Her 5 dakikada çalıştır
*/5 * * * * cd /path/to/project && npm start
```

### Docker

```bash
# .env dosyasını hazırlayın
cp .env.example .env

# Docker Compose ile başlatın
docker-compose up -d
```

## 📁 Proje Yapısı

```
├── src/
│   ├── app.js              # Ana uygulama
│   ├── config/config.js    # Yapılandırma
│   ├── database/           # Veritabanı bağlantı yönetimi
│   ├── services/           # Senkronizasyon servisleri
│   └── utils/logger.js     # Log sistemi
├── deployment-scripts/     # Kurulum scriptleri
├── logs/                   # Log dosyaları
└── tests/                  # Test dosyaları
```

## 🛠️ Geliştirme

### Yeni Servis Ekleme

1. `src/services/` altında yeni dosya oluşturun
2. `DataSyncService.js` içinde servisi kaydedin
3. Test edin

### Debug Modu

```bash
LOG_LEVEL=debug npm run dev
```

## 🔧 Sorun Giderme

### Yaygın Hatalar

- **Bağlantı Hatası**: `.env` dosyasındaki bilgileri kontrol edin
- **Permission Hatası**: Scripts için execute yetkisi verin (`chmod +x`)
- **Node.js Sürümü**: En az v18.0.0 gereklidir

### Log Kontrolü

```bash
# Son logları görün
tail -f logs/data-sync-console.log

# Windows'ta
Get-Content logs\data-sync-console.log -Tail 10 -Wait
```

## 📞 Destek

- 🐛 **Bug Reports**: GitHub Issues
- 💡 **Feature Requests**: GitHub Discussions
- 📧 **Direct Contact**: Create an issue

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.
