import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class DesenVaryantiService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncDesenVaryanti() {
    try {
      logger.info("Desen Varyantı senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      const desenVaryantiQuery = `
        SELECT * FROM DESENVARYANTI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY DESENVARYANTIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        desenVaryantiQuery
      );
      const desenVaryantlari = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${desenVaryantlari.length} desen varyantı bulundu`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const varyant of desenVaryantlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "DESENVARYANTI",
            "DESENVARYANTIID = @DESENVARYANTIID",
            { DESENVARYANTIID: varyant.DESENVARYANTIID }
          );

          if (!exists) {
            await this.insertDesenVaryanti(varyant);
            insertCount++;
          } else {
            await this.updateDesenVaryanti(varyant);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Desen varyantı ${varyant.DESENVARYANTIID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Desen Varyantı senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Desen Varyantı senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertDesenVaryanti(varyant) {
    // Get all column names from the object (excluding system fields if any)
    const columns = Object.keys(varyant);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO DESENVARYANTI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, varyant);
  }

  async updateDesenVaryanti(varyant) {
    // Get all column names except the primary key
    const columns = Object.keys(varyant).filter(
      (col) => col !== "DESENVARYANTIID"
    );
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE DESENVARYANTI SET ${setClause}
      WHERE DESENVARYANTIID = @DESENVARYANTIID`;

    await this.dbManager.executeCloudQuery(updateQuery, varyant);
  }
}

export default DesenVaryantiService;
