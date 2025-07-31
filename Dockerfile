FROM node:18-alpine

# Uygulama dizini oluştur
WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production && npm cache clean --force

# Uygulama kodunu kopyala
COPY . .

# Log dizini oluştur
RUN mkdir -p logs

# Non-root kullanıcı oluştur
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Dosya sahipliğini ayarla
RUN chown -R nodejs:nodejs /app
USER nodejs

# Port expose et (opsiyonel, eğer HTTP endpoint eklerseniz)
# EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Uygulamayı başlat
CMD ["node", "src/app.js"]
