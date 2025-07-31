import dotenv from "dotenv";

// Environment-specific .env file loading
const environment = process.env.NODE_ENV || "development";
const envFile = environment === "test" ? ".env.test" : ".env";

dotenv.config({ path: envFile });

const config = {
  environment: process.env.NODE_ENV || "development",

  databases: {
    local: {
      server: process.env.DB_LOCAL_SERVER,
      database: process.env.DB_LOCAL_DATABASE,
      user: process.env.DB_LOCAL_USER,
      password: process.env.DB_LOCAL_PASSWORD,
      port: parseInt(process.env.DB_LOCAL_PORT) || 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: parseInt(process.env.DB_LOCAL_TIMEOUT) || 120000,
        enableArithAbort: true,
      },
    },
    cloud: {
      server: process.env.DB_CLOUD_SERVER,
      database: process.env.DB_CLOUD_DATABASE,
      user: process.env.DB_CLOUD_USER,
      password: process.env.DB_CLOUD_PASSWORD,
      port: parseInt(process.env.DB_CLOUD_PORT) || 1434,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: parseInt(process.env.DB_CLOUD_TIMEOUT) || 120000,
        enableArithAbort: true,
      },
    },
  },

  email: {
    smtp: {
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
      secure: process.env.EMAIL_SMTP_SECURE === "true", // true for 465, false for 587
      user: process.env.EMAIL_SMTP_USER,
      password: process.env.EMAIL_SMTP_PASSWORD,
    },
    fromName: process.env.EMAIL_FROM_NAME || "Data Console",
    fromEmail: process.env.EMAIL_FROM || process.env.EMAIL_SMTP_USER,
    alerts: {
      errorRecipients: (process.env.EMAIL_ERROR_RECIPIENTS || "")
        .split(",")
        .filter((email) => email.trim()),
      reportRecipients: (process.env.EMAIL_REPORT_RECIPIENTS || "")
        .split(",")
        .filter((email) => email.trim()),
      summaryRecipients: (process.env.EMAIL_SUMMARY_RECIPIENTS || "")
        .split(",")
        .filter((email) => email.trim()),
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/data-sync-console.log",
  },

  sync: {
    daysBack: parseInt(process.env.SYNC_DAYS_BACK) || 15,
  },
};

export default config;
