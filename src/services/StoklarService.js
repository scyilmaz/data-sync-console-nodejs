import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class StoklarService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncStoklar() {
    try {
      logger.info("Stoklar senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      // C# kodundaki mantığı takip ediyoruz:
      // Sadece belirli ambarlar ve stok bakiyesi pozitif olanlar
      const stoklarQuery = `
        SELECT * FROM STOKLAR STK
        WHERE AMBARID IN (45,46)
          AND ISNULL(GIREN,0)-ISNULL(CIKAN,0)>0
        ORDER BY STOKLARID`;

      const localResult = await this.dbManager.executeLocalQuery(stoklarQuery);
      const stoklarKayitlari = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${stoklarKayitlari.length} stok kaydı bulundu`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const stok of stoklarKayitlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKLAR",
            "STOKLARID = @STOKLARID",
            { STOKLARID: stok.STOKLARID }
          );

          if (!exists) {
            await this.insertStoklar(stok);
            insertCount++;
          } else {
            await this.updateStoklar(stok);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Stok kaydı ${stok.STOKLARID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Stoklar senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Stoklar senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertStoklar(stok) {
    // Dynamic INSERT - all columns from the object
    const columns = Object.keys(stok);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO STOKLAR (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, stok);
  }

  async updateStoklar(stok) {
    // Dynamic UPDATE - all columns except primary key
    const columns = Object.keys(stok).filter((col) => col !== "STOKLARID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE STOKLAR SET ${setClause}
      WHERE STOKLARID = @STOKLARID`;

    await this.dbManager.executeCloudQuery(updateQuery, stok);
  }
}

export default StoklarService;
