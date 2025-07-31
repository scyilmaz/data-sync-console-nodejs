import sql from "mssql";
import config from "../config/config.js";
import logger from "../utils/logger.js";

class DatabaseManager {
  constructor() {
    this.localPool = null;
    this.cloudPool = null;
    this.isLocalConnected = false;
    this.isCloudConnected = false;
  }

  async connectLocal() {
    try {
      if (this.localPool && this.isLocalConnected) {
        return this.localPool;
      }

      logger.info("Yerel veritabanına bağlanılıyor...");
      this.localPool = await sql.connect(config.databases.local);
      this.isLocalConnected = true;
      logger.info("Yerel veritabanına başarıyla bağlanıldı!");
      return this.localPool;
    } catch (error) {
      logger.error("Yerel veritabanına bağlantı başarısız:", error);
      throw error;
    }
  }

  async connectCloud() {
    try {
      if (this.cloudPool && this.isCloudConnected) {
        return this.cloudPool;
      }

      logger.info("Bulut veritabanına bağlanılıyor...");
      this.cloudPool = new sql.ConnectionPool(config.databases.cloud);
      await this.cloudPool.connect();
      this.isCloudConnected = true;
      logger.info("Bulut veritabanına başarıyla bağlanıldı!");
      return this.cloudPool;
    } catch (error) {
      logger.error("Bulut veritabanına bağlantı başarısız:", error);
      throw error;
    }
  }

  async connectBoth() {
    try {
      await this.connectLocal();
      await this.connectCloud();
      logger.info("Her iki veritabanı bağlantısı başarıyla kuruldu!");
    } catch (error) {
      logger.error("Veritabanı bağlantıları kurulamadı:", error);
      throw error;
    }
  }

  async executeQuery(pool, query, parameters = {}) {
    try {
      const request = pool.request();

      // Add parameters to request
      Object.keys(parameters).forEach((key) => {
        request.input(key, parameters[key]);
      });

      const result = await request.query(query);
      return result;
    } catch (error) {
      logger.error("Sorgu çalıştırma başarısız:", {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  async executeLocalQuery(query, parameters = {}) {
    const pool = await this.connectLocal();
    return this.executeQuery(pool, query, parameters);
  }

  async executeCloudQuery(query, parameters = {}) {
    const pool = await this.connectCloud();
    return this.executeQuery(pool, query, parameters);
  }

  async checkRecordExists(pool, tableName, whereClause, parameters = {}) {
    try {
      const query = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
      const result = await this.executeQuery(pool, query, parameters);
      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error("Kayıt varlığı kontrolü başarısız:", error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.localPool && this.isLocalConnected) {
        await this.localPool.close();
        this.isLocalConnected = false;
        logger.info("Yerel veritabanı bağlantısı kapatıldı");
      }

      if (this.cloudPool && this.isCloudConnected) {
        await this.cloudPool.close();
        this.isCloudConnected = false;
        logger.info("Bulut veritabanı bağlantısı kapatıldı");
      }
    } catch (error) {
      logger.error("Veritabanı bağlantıları kapatılırken hata:", error);
    }
  }

  getLocalPool() {
    return this.localPool;
  }

  getCloudPool() {
    return this.cloudPool;
  }
}

export default DatabaseManager;
