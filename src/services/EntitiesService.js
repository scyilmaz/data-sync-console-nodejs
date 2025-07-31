import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class EntitiesService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncFirmalar() {
    try {
      logger.info("Firmalar senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      // Get recent firms from local database using SELECT *
      const firmalarQuery = `
        SELECT * FROM FIRMALAR 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY FIRMAID`;

      const localResult = await this.dbManager.executeLocalQuery(firmalarQuery);
      const firmalar = localResult.recordset;

      logger.info(`Senkronize edilecek ${firmalar.length} firma bulundu`);

      let insertCount = 0;
      let updateCount = 0;

      for (const firma of firmalar) {
        try {
          // Check if firm exists in cloud database
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "FIRMALAR",
            "FIRMAID = @FIRMAID",
            { FIRMAID: firma.FIRMAID }
          );

          if (!exists) {
            // Insert new firm
            await this.insertFirma(firma);
            insertCount++;
          } else {
            // Update existing firm
            await this.updateFirma(firma);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Firma ${firma.FIRMAID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Firmalar senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Firmalar senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertFirma(firma) {
    // Dynamic INSERT - all columns from the object
    const columns = Object.keys(firma);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO FIRMALAR (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, firma);
  }

  async updateFirma(firma) {
    // Dynamic UPDATE - all columns except primary key
    const columns = Object.keys(firma).filter((col) => col !== "FIRMAID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE FIRMALAR SET ${setClause}
      WHERE FIRMAID = @FIRMAID`;

    await this.dbManager.executeCloudQuery(updateQuery, firma);
  }
}

export default EntitiesService;
