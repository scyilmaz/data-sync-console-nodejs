import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class DesenIplikleriService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncDesenIplikleri() {
    try {
      logger.info("Desen İplikleri senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      const desenIplikleriQuery = `
        SELECT * FROM DESENIPLIKLERI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY DESENIPLIKLERIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        desenIplikleriQuery
      );
      const desenIplikleri = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${desenIplikleri.length} desen ipliği bulundu`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const iplik of desenIplikleri) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "DESENIPLIKLERI",
            "DESENIPLIKLERIID = @DESENIPLIKLERIID",
            { DESENIPLIKLERIID: iplik.DESENIPLIKLERIID }
          );

          if (!exists) {
            await this.insertDesenIplikleri(iplik);
            insertCount++;
          } else {
            await this.updateDesenIplikleri(iplik);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Desen ipliği ${iplik.DESENIPLIKLERIID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Desen İplikleri senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Desen İplikleri senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertDesenIplikleri(iplik) {
    const columns = Object.keys(iplik);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO DESENIPLIKLERI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, iplik);
  }

  async updateDesenIplikleri(iplik) {
    const columns = Object.keys(iplik).filter(
      (col) => col !== "DESENIPLIKLERIID"
    );
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE DESENIPLIKLERI SET ${setClause}
      WHERE DESENIPLIKLERIID = @DESENIPLIKLERIID`;

    await this.dbManager.executeCloudQuery(updateQuery, iplik);
  }
}

export default DesenIplikleriService;
