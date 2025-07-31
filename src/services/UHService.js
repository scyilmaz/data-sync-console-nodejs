import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class UHService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncUH() {
    try {
      logger.info("Starting UH synchronization...");

      await this.dbManager.connectBoth();

      const uhQuery = `
        SELECT * FROM UH 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY UHID`;

      const localResult = await this.dbManager.executeLocalQuery(uhQuery);
      const uhKayitlari = localResult.recordset;

      logger.info(`Found ${uhKayitlari.length} UH records to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const uh of uhKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "UH",
            "UHID = @UHID",
            { UHID: uh.UHID }
          );

          if (!exists) {
            await this.insertUH(uh);
            insertCount++;
          } else {
            await this.updateUH(uh);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error syncing UH record ${uh.UHID}:`, error);
        }
      }

      logger.info(
        `UH sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("UH synchronization failed:", error);
      throw error;
    }
  }

  async insertUH(uh) {
    const columns = Object.keys(uh);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO UH (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, uh);
  }

  async updateUH(uh) {
    const columns = Object.keys(uh).filter((col) => col !== "UHID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE UH SET ${setClause}
      WHERE UHID = @UHID`;

    await this.dbManager.executeCloudQuery(updateQuery, uh);
  }
}

export default UHService;
