import nodemailer from "nodemailer";
import config from "../config/config.js";
import logger from "../utils/logger.js";

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      // Email yapılandırması var mı kontrol et
      if (!config.email || !config.email.smtp.host || !config.email.smtp.user) {
        logger.warn(
          "Email yapılandırması bulunamadı. Email bildirimleri devre dışı."
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure, // true for 465, false for other ports
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.isConfigured = true;
      // Başarıyla yapılandırıldı
      logger.info("Email transporter başarıyla yapılandırıldı");
    } catch (error) {
      logger.error("Email gönderilirken hata:", error);
      throw error;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.isConfigured) {
      logger.warn(
        "Email servisi yapılandırılmamış. Email gönderimi atlanıyor."
      );
      return false;
    }

    try {
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email başarıyla gönderildi: ${to}`, {
        messageId: info.messageId,
      });
      return true;
    } catch (error) {
      logger.error("Email gönderimi başarısız:", error);
      return false;
    }
  }

  async sendErrorAlert(error, operation = "Bilinmeyen İşlem") {
    const subject = `🚨 Veri Senkronizasyon Hatası - ${operation}`;
    const htmlContent = this.generateErrorEmailTemplate(error, operation);

    return await this.sendEmail(
      config.email.alerts.errorRecipients,
      subject,
      htmlContent
    );
  }

  async sendSuccessReport(report) {
    const subject = `✅ Veri Senkronizasyon Başarı Raporu - ${new Date().toLocaleDateString(
      "tr-TR"
    )}`;
    const htmlContent = this.generateSuccessEmailTemplate(report);

    return await this.sendEmail(
      config.email.alerts.reportRecipients,
      subject,
      htmlContent
    );
  }

  async sendDailySummary(summary) {
    const subject = `📊 Günlük Veri Senkronizasyon Özeti - ${new Date().toLocaleDateString(
      "tr-TR"
    )}`;
    const htmlContent = this.generateDailySummaryTemplate(summary);

    return await this.sendEmail(
      config.email.alerts.summaryRecipients,
      subject,
      htmlContent
    );
  }

  generateErrorEmailTemplate(error, operation) {
    const timestamp = new Date().toLocaleString("tr-TR");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .error-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table th, .info-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .info-table th { background-color: #f8f9fa; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Veri Senkronizasyon Hatası</h1>
            <p>Veri senkronizasyonu sırasında hata oluştu</p>
        </div>
        <div class="content">
            <table class="info-table">
                <tr><th>Zaman</th><td>${timestamp}</td></tr>
                <tr><th>İşlem</th><td>${operation}</td></tr>
                <tr><th>Sunucu</th><td>${
                  process.env.HOSTNAME || "Bilinmiyor"
                }</td></tr>
                <tr><th>Ortam</th><td>${config.environment}</td></tr>
            </table>
            
            <div class="error-box">
                <h3>Hata Detayları:</h3>
                <p><strong>Mesaj:</strong> ${error.message}</p>
                <p><strong>Tip:</strong> ${error.name || "Bilinmiyor"}</p>
                ${
                  error.code ? `<p><strong>Kod:</strong> ${error.code}</p>` : ""
                }
            </div>
            
            ${
              error.stack
                ? `
                <h3>Stack Trace:</h3>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${error.stack}</pre>
            `
                : ""
            }
            
            <h3>Öneriler:</h3>
            <ul>
                <li>Veritabanı bağlantısını kontrol edin</li>
                <li>Network erişimini doğrulayın</li>
                <li>Log dosyalarını inceleyin</li>
                <li>Sistem kaynaklarını kontrol edin</li>
            </ul>
        </div>
        <div class="footer">
            Bu e-posta Veri Senkronizasyon Konsolu tarafından otomatik olarak gönderilmiştir.
        </div>
    </div>
</body>
</html>
    `;
  }

  generateSuccessEmailTemplate(report) {
    const timestamp = new Date().toLocaleString("tr-TR");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .stats-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .stats-table th { background-color: #f8f9fa; }
        .stats-table .number { text-align: center; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Veri Senkronizasyonu Başarılı</h1>
            <p>Veri senkronizasyonu başarıyla tamamlandı</p>
        </div>
        <div class="content">
            <div class="success-box">
                <h3>Senkronizasyon tamamlandı!</h3>
                <p><strong>Başlangıç:</strong> ${report.startTime}</p>
                <p><strong>Bitiş:</strong> ${timestamp}</p>
                <p><strong>Süre:</strong> ${report.duration} saniye</p>
            </div>
            
            <h3>İşlem Detayları:</h3>
            <table class="stats-table">
                <tr><th>Modül</th><th>Eklenen</th><th>Güncellenen</th><th>Toplam</th></tr>
                ${Object.entries(report.modules || {})
                  .map(
                    ([module, stats]) => `
                    <tr>
                        <td>${module}</td>
                        <td class="number">${stats.inserted || 0}</td>
                        <td class="number">${stats.updated || 0}</td>
                        <td class="number">${
                          (stats.inserted || 0) + (stats.updated || 0)
                        }</td>
                    </tr>
                `
                  )
                  .join("")}
                <tr style="background-color: #e9ecef; font-weight: bold;">
                    <td>TOPLAM</td>
                    <td class="number">${report.totalInserted || 0}</td>
                    <td class="number">${report.totalUpdated || 0}</td>
                    <td class="number">${report.totalProcessed || 0}</td>
                </tr>
            </table>
            
            ${
              report.warnings && report.warnings.length > 0
                ? `
                <h3>Uyarılar:</h3>
                <ul>
                    ${report.warnings
                      .map((warning) => `<li>${warning}</li>`)
                      .join("")}
                </ul>
            `
                : ""
            }
        </div>
        <div class="footer">
            Bu e-posta Veri Senkronizasyon Konsolu tarafından otomatik olarak gönderilmiştir.
        </div>
    </div>
</body>
</html>
    `;
  }

  generateDailySummaryTemplate(summary) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .number { font-size: 24px; font-weight: bold; color: #007bff; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Günlük Özet</h1>
            <p>Data Sync Daily Summary</p>
        </div>
        <div class="content">
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Toplam Sync</h3>
                    <div class="number">${summary.totalSyncs || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>Başarılı</h3>
                    <div class="number">${summary.successfulSyncs || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>Hatalı</h3>
                    <div class="number">${summary.failedSyncs || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>İşlenen Kayıt</h3>
                    <div class="number">${summary.totalRecords || 0}</div>
                </div>
            </div>
            
            <h3>Son 24 Saat İçindeki Aktiviteler:</h3>
            <ul>
                ${(summary.activities || [])
                  .map((activity) => `<li>${activity}</li>`)
                  .join("")}
            </ul>
        </div>
        <div class="footer">
            Bu e-posta Data Console Node.js uygulaması tarafından otomatik olarak gönderilmiştir.
        </div>
    </div>
</body>
</html>
    `;
  }

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async testEmailConnection() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info("Email service connection test successful");
      return true;
    } catch (error) {
      logger.error("Email service connection test failed:", error);
      return false;
    }
  }
}

export default EmailService;
