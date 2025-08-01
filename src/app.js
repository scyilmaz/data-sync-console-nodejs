import DataSyncService from "./services/DataSyncService.js";
import logger from "./utils/logger.js";

class App {
  constructor() {
    this.syncService = new DataSyncService();
  }

  async run() {
    try {
      logger.info("===============================================");
      logger.info("Data Sync Console Node.js Application Started");
      logger.info("===============================================");

      // Parse command line arguments
      const args = process.argv.slice(2);
      const command = args[0] || "sync";

      switch (command) {
        case "sync":
          await this.executeSync();
          break;
        case "sync-stoklar":
          await this.executeSyncStoklar();
          break;
        case "sync-without-stoklar":
          await this.executeSyncWithoutStoklar();
          break;
        case "test":
          await this.testConnections();
          break;
        case "help":
          this.showHelp();
          break;
        default:
          logger.warn(`Unknown command: ${command}`);
          this.showHelp();
          break;
      }
    } catch (error) {
      logger.error("Application failed:", error);
      process.exit(1);
    }
  }

  async executeSync() {
    try {
      await this.syncService.executeSync();
      logger.info("Synchronization process completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Synchronization process failed:", error);
      process.exit(1);
    }
  }

  async executeSyncStoklar() {
    try {
      logger.info("Sadece STOKLAR senkronizasyonu başlatılıyor...");
      await this.syncService.executeSyncStoklar();
      logger.info("STOKLAR synchronization process completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("STOKLAR synchronization process failed:", error);
      process.exit(1);
    }
  }

  async executeSyncWithoutStoklar() {
    try {
      logger.info("STOKLAR hariç tüm tablolar senkronize ediliyor...");
      await this.syncService.executeSyncWithoutStoklar();
      logger.info(
        "Synchronization process (without STOKLAR) completed successfully"
      );
      process.exit(0);
    } catch (error) {
      logger.error("Synchronization process (without STOKLAR) failed:", error);
      process.exit(1);
    }
  }

  async testConnections() {
    try {
      await this.syncService.testConnections();
      logger.info("Database connection tests completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Database connection tests failed:", error);
      process.exit(1);
    }
  }

  showHelp() {
    console.log(`
Data Sync Console Node.js Application

Usage: npm start [command]

Commands:
  sync                 - Execute full data synchronization (default)
  sync-stoklar         - Execute only STOKLAR synchronization
  sync-without-stoklar - Execute all synchronization except STOKLAR
  test                 - Test database connections
  help                 - Show this help message

Examples:
  npm start                     # Run full synchronization
  npm start sync               # Run full synchronization
  npm start sync-stoklar       # Run only STOKLAR sync
  npm start sync-without-stoklar # Run all except STOKLAR
  npm start test               # Test database connections
  npm start help               # Show help

Environment Variables:
  Create a .env file with the following variables:
  - DB_LOCAL_SERVER, DB_LOCAL_DATABASE, DB_LOCAL_USER, DB_LOCAL_PASSWORD
  - DB_CLOUD_SERVER, DB_CLOUD_DATABASE, DB_CLOUD_USER, DB_CLOUD_PASSWORD
  - LOG_LEVEL, SYNC_DAYS_BACK
    `);
  }

  // Handle graceful shutdown
  setupGracefulShutdown() {
    const signals = ["SIGTERM", "SIGINT"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);

        try {
          await this.syncService.dbManager.close();
        } catch (error) {
          logger.error("Error during shutdown:", error);
        }

        process.exit(0);
      });
    });
  }
}

// Create and run the application
const app = new App();
app.setupGracefulShutdown();
app.run().catch((error) => {
  logger.error("Unhandled application error:", error);
  process.exit(1);
});
