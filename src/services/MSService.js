import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class MSService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncMS() {
    try {
      logger.info("Starting MS synchronization...");

      await this.dbManager.connectBoth();

      const msQuery = `
        SELECT * FROM MS 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY MSID`;

      const localResult = await this.dbManager.executeLocalQuery(msQuery);
      const msKayitlari = localResult.recordset;

      logger.info(`Found ${msKayitlari.length} MS records to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const ms of msKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "MS",
            "MSID = @MSID",
            { MSID: ms.MSID }
          );

          if (!exists) {
            await this.insertMS(ms);
            insertCount++;
          } else {
            await this.updateMS(ms);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error syncing MS record ${ms.MSID}:`, error);
        }
      }

      logger.info(
        `MS sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("MS synchronization failed:", error);
      throw error;
    }
  }

  async insertMS(ms) {
    const columns = Object.keys(ms);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO MS (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, ms);
  }

  async updateMS(ms) {
    const columns = Object.keys(ms).filter((col) => col !== "MSID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE MS SET ${setClause}
      WHERE MSID = @MSID`;

    await this.dbManager.executeCloudQuery(updateQuery, ms);
  }
}

export default MSService;
