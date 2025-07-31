import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class StockService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncStokKategori() {
    try {
      logger.info("Stok Kategorisi senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      const stokKategoriQuery = `
        SELECT STOKKATEGORIID, STOKKATEGORIKODU, STOKKATEGORIAD, 
               USTSTOKKATEGORIID, GECERLIMI, ACIKLAMA
        FROM STOKKATEGORI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKKATEGORIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKategoriQuery
      );
      const stokKategoriler = localResult.recordset;

      logger.info(`Found ${stokKategoriler.length} stock categories to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const kategori of stokKategoriler) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKKATEGORI",
            "STOKKATEGORIID = @STOKKATEGORIID",
            { STOKKATEGORIID: kategori.STOKKATEGORIID }
          );

          if (!exists) {
            await this.insertStokKategori(kategori);
            insertCount++;
          } else {
            await this.updateStokKategori(kategori);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Error processing stock category ${kategori.STOKKATEGORIID}:`,
            error
          );
        }
      }

      logger.info(
        `StokKategori sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );
    } catch (error) {
      logger.error("Stok Kategorisi senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async syncStokKalite() {
    try {
      logger.info("Stok Kalitesi senkronizasyonu başlatılıyor...");

      const stokKaliteQuery = `
        SELECT STOKKALITEID, STOKKOD, STOKKALITEAD, GECERLIMI, ACIKLAMA
        FROM STOKKALITE 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKKALITEID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKaliteQuery
      );
      const stokKaliteler = localResult.recordset;

      logger.info(`Found ${stokKaliteler.length} stock qualities to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const kalite of stokKaliteler) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKKALITE",
            "STOKKALITEID = @STOKKALITEID",
            { STOKKALITEID: kalite.STOKKALITEID }
          );

          if (!exists) {
            await this.insertStokKalite(kalite);
            insertCount++;
          } else {
            await this.updateStokKalite(kalite);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Error processing stock quality ${kalite.STOKKALITEID}:`,
            error
          );
        }
      }

      logger.info(
        `StokKalite sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );
    } catch (error) {
      logger.error("Stok Kalitesi senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async syncStokKarti() {
    try {
      logger.info("Stok Kartı senkronizasyonu başlatılıyor...");

      const stokKartiQuery = `
        SELECT STOKID, STOKKODU, STOKAD, STOKKATEGORIID, STOKKALITEID, 
               BIRIMID, ANABILIMID, VERGIORANID, GECERLIMI, ACIKLAMA
        FROM STOKKARTI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKartiQuery
      );
      const stokKartlari = localResult.recordset;

      logger.info(`Found ${stokKartlari.length} stock cards to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const stok of stokKartlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKKARTI",
            "STOKID = @STOKID",
            { STOKID: stok.STOKID }
          );

          if (!exists) {
            await this.insertStokKarti(stok);
            insertCount++;
          } else {
            await this.updateStokKarti(stok);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error processing stock card ${stok.STOKID}:`, error);
        }
      }

      logger.info(
        `StokKarti sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );
    } catch (error) {
      logger.error("Stok Kartı senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertStokKategori(kategori) {
    const insertQuery = `
      INSERT INTO STOKKATEGORI
      (STOKKATEGORIID, STOKKATEGORIKODU, STOKKATEGORIAD, USTSTOKKATEGORIID, GECERLIMI, ACIKLAMA)
      VALUES 
      (@STOKKATEGORIID, @STOKKATEGORIKODU, @STOKKATEGORIAD, @USTSTOKKATEGORIID, @GECERLIMI, @ACIKLAMA)`;

    await this.dbManager.executeCloudQuery(insertQuery, kategori);
  }

  async updateStokKategori(kategori) {
    const updateQuery = `
      UPDATE STOKKATEGORI SET
      STOKKATEGORIKODU = @STOKKATEGORIKODU, STOKKATEGORIAD = @STOKKATEGORIAD,
      USTSTOKKATEGORIID = @USTSTOKKATEGORIID, GECERLIMI = @GECERLIMI, ACIKLAMA = @ACIKLAMA
      WHERE STOKKATEGORIID = @STOKKATEGORIID`;

    await this.dbManager.executeCloudQuery(updateQuery, kategori);
  }

  async insertStokKalite(kalite) {
    const insertQuery = `
      INSERT INTO STOKKALITE
      (STOKKALITEID, STOKKOD, STOKKALITEAD, GECERLIMI, ACIKLAMA)
      VALUES 
      (@STOKKALITEID, @STOKKOD, @STOKKALITEAD, @GECERLIMI, @ACIKLAMA)`;

    await this.dbManager.executeCloudQuery(insertQuery, kalite);
  }

  async updateStokKalite(kalite) {
    const updateQuery = `
      UPDATE STOKKALITE SET
      STOKKOD = @STOKKOD, STOKKALITEAD = @STOKKALITEAD, 
      GECERLIMI = @GECERLIMI, ACIKLAMA = @ACIKLAMA
      WHERE STOKKALITEID = @STOKKALITEID`;

    await this.dbManager.executeCloudQuery(updateQuery, kalite);
  }

  async insertStokKarti(stok) {
    const insertQuery = `
      INSERT INTO STOKKARTI
      (STOKID, STOKKODU, STOKAD, STOKKATEGORIID, STOKKALITEID, 
       BIRIMID, ANABILIMID, VERGIORANID, GECERLIMI, ACIKLAMA)
      VALUES 
      (@STOKID, @STOKKODU, @STOKAD, @STOKKATEGORIID, @STOKKALITEID, 
       @BIRIMID, @ANABILIMID, @VERGIORANID, @GECERLIMI, @ACIKLAMA)`;

    await this.dbManager.executeCloudQuery(insertQuery, stok);
  }

  async updateStokKarti(stok) {
    const updateQuery = `
      UPDATE STOKKARTI SET
      STOKKODU = @STOKKODU, STOKAD = @STOKAD, STOKKATEGORIID = @STOKKATEGORIID,
      STOKKALITEID = @STOKKALITEID, BIRIMID = @BIRIMID, ANABILIMID = @ANABILIMID,
      VERGIORANID = @VERGIORANID, GECERLIMI = @GECERLIMI, ACIKLAMA = @ACIKLAMA
      WHERE STOKID = @STOKID`;

    await this.dbManager.executeCloudQuery(updateQuery, stok);
  }
}

export default StockService;
