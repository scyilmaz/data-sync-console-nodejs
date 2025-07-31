import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class UsersService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncPersonel() {
    try {
      logger.info("Personel senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      const personelQuery = `
        SELECT * FROM PERSONEL 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY PERSONELID`;

      const localResult = await this.dbManager.executeLocalQuery(personelQuery);
      const personeller = localResult.recordset;

      logger.info(`Senkronize edilecek ${personeller.length} personel bulundu`);

      let insertCount = 0;
      let updateCount = 0;

      for (const personel of personeller) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "PERSONEL",
            "PERSONELID = @PERSONELID",
            { PERSONELID: personel.PERSONELID }
          );

          if (!exists) {
            await this.insertPersonel(personel);
            insertCount++;
          } else {
            await this.updatePersonel(personel);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Personel ${personel.PERSONELID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Personel senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Personel senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertPersonel(personel) {
    // Dynamic INSERT - all columns from the object
    const columns = Object.keys(personel);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO PERSONEL (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, personel);
  }

  async updatePersonel(personel) {
    // Dynamic UPDATE - all columns except primary key
    const columns = Object.keys(personel).filter((col) => col !== "PERSONELID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE PERSONEL SET ${setClause}
      WHERE PERSONELID = @PERSONELID`;

    await this.dbManager.executeCloudQuery(updateQuery, personel);
  }
}

export default UsersService;
