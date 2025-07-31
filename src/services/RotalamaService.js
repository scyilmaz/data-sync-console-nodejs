import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class RotalamaService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncRotalama() {
    try {
      logger.info("Starting Rotalama synchronization...");

      await this.dbManager.connectBoth();

      const rotalamaQuery = `
        SELECT * FROM ROTALAMA 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY ROTALAMAID`;

      const localResult = await this.dbManager.executeLocalQuery(rotalamaQuery);
      const rotalamaKayitlari = localResult.recordset;

      logger.info(`Found ${rotalamaKayitlari.length} routing records to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const rota of rotalamaKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "ROTALAMA",
            "ROTALAMAID = @ROTALAMAID",
            { ROTALAMAID: rota.ROTALAMAID }
          );

          if (!exists) {
            await this.insertRotalama(rota);
            insertCount++;
          } else {
            await this.updateRotalama(rota);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Error syncing routing record ${rota.ROTALAMAID}:`,
            error
          );
        }
      }

      logger.info(
        `Rotalama sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Rotalama synchronization failed:", error);
      throw error;
    }
  }

  async insertRotalama(rota) {
    const columns = Object.keys(rota);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO ROTALAMA (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, rota);
  }

  async updateRotalama(rota) {
    const columns = Object.keys(rota).filter((col) => col !== "ROTALAMAID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE ROTALAMA SET ${setClause}
      WHERE ROTALAMAID = @ROTALAMAID`;

    await this.dbManager.executeCloudQuery(updateQuery, rota);
  }
}

export default RotalamaService;
