import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class ISEmriService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncISEmri() {
    try {
      logger.info("Starting ISEmri synchronization...");

      await this.dbManager.connectBoth();

      const isEmriQuery = `
        SELECT * FROM ISEMRI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY ISEMRIID`;

      const localResult = await this.dbManager.executeLocalQuery(isEmriQuery);
      const isEmriKayitlari = localResult.recordset;

      logger.info(`Found ${isEmriKayitlari.length} work order records to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const isEmri of isEmriKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "ISEMRI",
            "ISEMRIID = @ISEMRIID",
            { ISEMRIID: isEmri.ISEMRIID }
          );

          if (!exists) {
            await this.insertISEmri(isEmri);
            insertCount++;
          } else {
            await this.updateISEmri(isEmri);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error syncing work order ${isEmri.ISEMRIID}:`, error);
        }
      }

      logger.info(
        `ISEmri sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("ISEmri synchronization failed:", error);
      throw error;
    }
  }

  async insertISEmri(isEmri) {
    const columns = Object.keys(isEmri);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO ISEMRI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, isEmri);
  }

  async updateISEmri(isEmri) {
    const columns = Object.keys(isEmri).filter((col) => col !== "ISEMRIID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE ISEMRI SET ${setClause}
      WHERE ISEMRIID = @ISEMRIID`;

    await this.dbManager.executeCloudQuery(updateQuery, isEmri);
  }
}

export default ISEmriService;
