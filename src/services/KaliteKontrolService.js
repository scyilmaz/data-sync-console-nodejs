import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class KaliteKontrolService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncKaliteKontrol() {
    try {
      logger.info("Starting KaliteKontrol synchronization...");

      await this.dbManager.connectBoth();

      const kaliteKontrolQuery = `
        SELECT * FROM KALITEKONTROL 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY KALITEKONTROLID`;

      const localResult = await this.dbManager.executeLocalQuery(
        kaliteKontrolQuery
      );
      const kaliteKontrolKayitlari = localResult.recordset;

      logger.info(
        `Found ${kaliteKontrolKayitlari.length} quality control records to sync`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const kalite of kaliteKontrolKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "KALITEKONTROL",
            "KALITEKONTROLID = @KALITEKONTROLID",
            { KALITEKONTROLID: kalite.KALITEKONTROLID }
          );

          if (!exists) {
            await this.insertKaliteKontrol(kalite);
            insertCount++;
          } else {
            await this.updateKaliteKontrol(kalite);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Error syncing quality control record ${kalite.KALITEKONTROLID}:`,
            error
          );
        }
      }

      logger.info(
        `KaliteKontrol sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("KaliteKontrol synchronization failed:", error);
      throw error;
    }
  }

  async insertKaliteKontrol(kalite) {
    const columns = Object.keys(kalite);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO KALITEKONTROL (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, kalite);
  }

  async updateKaliteKontrol(kalite) {
    const columns = Object.keys(kalite).filter(
      (col) => col !== "KALITEKONTROLID"
    );
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE KALITEKONTROL SET ${setClause}
      WHERE KALITEKONTROLID = @KALITEKONTROLID`;

    await this.dbManager.executeCloudQuery(updateQuery, kalite);
  }
}

export default KaliteKontrolService;
