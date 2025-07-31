import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class DesenKartiService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncDesenKarti() {
    try {
      logger.info("Desen Kartı senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      const desenKartiQuery = `
        SELECT * FROM DESENKARTI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY DESENKARTIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        desenKartiQuery
      );
      const desenKartlari = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${desenKartlari.length} desen kartı bulundu`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const desen of desenKartlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "DESENKARTI",
            "DESENKARTIID = @DESENKARTIID",
            { DESENKARTIID: desen.DESENKARTIID }
          );

          if (!exists) {
            await this.insertDesenKarti(desen);
            insertCount++;
          } else {
            await this.updateDesenKarti(desen);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Desen kartı ${desen.DESENKARTIID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Desen Kartı senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Desen Kartı senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertDesenKarti(desen) {
    // Get all column names from the object (excluding system fields if any)
    const columns = Object.keys(desen);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO DESENKARTI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, desen);
  }

  async updateDesenKarti(desen) {
    // Get all column names except the primary key
    const columns = Object.keys(desen).filter((col) => col !== "DESENKARTIID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE DESENKARTI SET ${setClause}
      WHERE DESENKARTIID = @DESENKARTIID`;

    await this.dbManager.executeCloudQuery(updateQuery, desen);
  }
}

export default DesenKartiService;
