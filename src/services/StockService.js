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
        SELECT * FROM STOKKATEGORI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKKATEGORIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKategoriQuery
      );
      const stokKategoriler = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${stokKategoriler.length} stok kategorisi bulundu`
      );

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
            `Stok kategorisi ${kategori.STOKKATEGORIID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Stok Kategorisi senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Stok Kategorisi senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async syncStokKalite() {
    try {
      logger.info("Stok Kalitesi senkronizasyonu başlatılıyor...");

      const stokKaliteQuery = `
        SELECT * FROM STOKKALITE 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKKALITEID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKaliteQuery
      );
      const stokKaliteler = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${stokKaliteler.length} stok kalitesi bulundu`
      );

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
            `Stok kalitesi ${kalite.STOKKALITEID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Stok Kalitesi senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Stok Kalitesi senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async syncStokKarti() {
    try {
      logger.info("Stok Kartı senkronizasyonu başlatılıyor...");

      const stokKartiQuery = `
        SELECT * FROM STOKKARTI 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY STOKKARTIID`;

      const localResult = await this.dbManager.executeLocalQuery(
        stokKartiQuery
      );
      const stokKartlari = localResult.recordset;

      logger.info(
        `Senkronize edilecek ${stokKartlari.length} stok kartı bulundu`
      );

      let insertCount = 0;
      let updateCount = 0;

      for (const stok of stokKartlari) {
        try {
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "STOKKARTI",
            "STOKKARTIID = @STOKKARTIID",
            { STOKKARTIID: stok.STOKKARTIID }
          );

          if (!exists) {
            await this.insertStokKarti(stok);
            insertCount++;
          } else {
            await this.updateStokKarti(stok);
            updateCount++;
          }
        } catch (error) {
          logger.error(
            `Stok kartı ${stok.STOKKARTIID} senkronizasyonunda hata:`,
            error
          );
        }
      }

      logger.info(
        `Stok Kartı senkronizasyonu tamamlandı. Eklenen: ${insertCount}, Güncellenen: ${updateCount}`
      );

      return { inserted: insertCount, updated: updateCount };
    } catch (error) {
      logger.error("Stok Kartı senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  // Dynamic INSERT methods
  async insertStokKategori(kategori) {
    const columns = Object.keys(kategori);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO STOKKATEGORI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, kategori);
  }

  async updateStokKategori(kategori) {
    const columns = Object.keys(kategori).filter(
      (col) => col !== "STOKKATEGORIID"
    );
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE STOKKATEGORI SET ${setClause}
      WHERE STOKKATEGORIID = @STOKKATEGORIID`;

    await this.dbManager.executeCloudQuery(updateQuery, kategori);
  }

  async insertStokKalite(kalite) {
    const columns = Object.keys(kalite);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO STOKKALITE (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, kalite);
  }

  async updateStokKalite(kalite) {
    const columns = Object.keys(kalite).filter((col) => col !== "STOKKALITEID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE STOKKALITE SET ${setClause}
      WHERE STOKKALITEID = @STOKKALITEID`;

    await this.dbManager.executeCloudQuery(updateQuery, kalite);
  }

  async insertStokKarti(stok) {
    const columns = Object.keys(stok);
    const values = columns.map((col) => `@${col}`).join(", ");
    const columnsList = columns.join(", ");

    const insertQuery = `
      INSERT INTO STOKKARTI (${columnsList})
      VALUES (${values})`;

    await this.dbManager.executeCloudQuery(insertQuery, stok);
  }

  async updateStokKarti(stok) {
    const columns = Object.keys(stok).filter((col) => col !== "STOKKARTIID");
    const setClause = columns.map((col) => `${col} = @${col}`).join(", ");

    const updateQuery = `
      UPDATE STOKKARTI SET ${setClause}
      WHERE STOKKARTIID = @STOKKARTIID`;

    await this.dbManager.executeCloudQuery(updateQuery, stok);
  }
}

export default StockService;
