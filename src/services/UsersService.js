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
        SELECT PERSONELID, PERSONELKODU, YETKIGRUBU, SICILNO, ADI, SOYADI, 
               UNVANI, DOGUMTARIHI, EPOSTA, TELULKEKODU, TELEFON, GECERLIMI, 
               ACIKLAMA
        FROM PERSONEL 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY PERSONELID`;

      const localResult = await this.dbManager.executeLocalQuery(personelQuery);
      const personeller = localResult.recordset;

      logger.info(`Found ${personeller.length} personnel to sync`);

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
            `Error processing personnel ${personel.PERSONELID}:`,
            error
          );
        }
      }

      logger.info(
        `Personel sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );
    } catch (error) {
      logger.error("Personel senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertPersonel(personel) {
    const insertQuery = `
      INSERT INTO PERSONEL
      (PERSONELID, PERSONELKODU, YETKIGRUBU, SICILNO, ADI, SOYADI, 
       UNVANI, DOGUMTARIHI, EPOSTA, TELULKEKODU, TELEFON, GECERLIMI, ACIKLAMA)
      VALUES 
      (@PERSONELID, @PERSONELKODU, @YETKIGRUBU, @SICILNO, @ADI, @SOYADI, 
       @UNVANI, @DOGUMTARIHI, @EPOSTA, @TELULKEKODU, @TELEFON, @GECERLIMI, @ACIKLAMA)`;

    await this.dbManager.executeCloudQuery(insertQuery, personel);
  }

  async updatePersonel(personel) {
    const updateQuery = `
      UPDATE PERSONEL SET
      PERSONELKODU = @PERSONELKODU, YETKIGRUBU = @YETKIGRUBU, SICILNO = @SICILNO, 
      ADI = @ADI, SOYADI = @SOYADI, UNVANI = @UNVANI, DOGUMTARIHI = @DOGUMTARIHI, 
      EPOSTA = @EPOSTA, TELULKEKODU = @TELULKEKODU, TELEFON = @TELEFON, 
      GECERLIMI = @GECERLIMI, ACIKLAMA = @ACIKLAMA
      WHERE PERSONELID = @PERSONELID`;

    await this.dbManager.executeCloudQuery(updateQuery, personel);
  }
}

export default UsersService;
