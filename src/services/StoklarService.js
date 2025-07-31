import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class StoklarService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncStoklar() {
    try {
      logger.info("Starting Stoklar synchronization...");

      await this.dbManager.connectBoth();

      const stoklarQuery = `
        SELECT * FROM STOKLAR 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKID`;

      const localResult = await this.dbManager.executeLocalQuery(stoklarQuery);
      const stoklarKayitlari = localResult.recordset;

      logger.info(`Found ${stoklarKayitlari.length} stock records to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const stok of stoklarKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKLAR",
            "STOKID = @STOKID",
            { STOKID: stok.STOKID }
          );

          if (!exists) {
            await this.insertStoklar(stok);
            insertCount++;
          } else {
            await this.updateStoklar(stok);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error syncing stock record ${stok.STOKID}:`, error);
        }
      }

      logger.info(
        `Stoklar sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Stoklar synchronization failed:", error);
      throw error;
    }
  }

  async insertStoklar(stok) {
    const columns = Object.keys(stok);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO STOKLAR (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, stok);
  }

  async updateStoklar(stok) {
    const columns = Object.keys(stok).filter((col) => col !== "STOKID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE STOKLAR SET ${setClause}
      WHERE STOKID = @STOKID`;

    await this.dbManager.executeCloudQuery(updateQuery, stok);
  }
}

export default StoklarService;
