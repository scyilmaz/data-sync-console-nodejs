import DatabaseManager from "../database/DatabaseManager.js";
import logger from "../utils/logger.js";
import config from "../config/config.js";

class EntitiesService {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async syncFirmalar() {
    try {
      logger.info("Firmalar senkronizasyonu başlatılıyor...");

      await this.dbManager.connectBoth();

      // Get recent firms from local database
      const firmalarQuery = `
        SELECT FIRMAID, FIRMATIPIID, FIRMAKODU, MUHASEBEKODU, UNVANI, YURTDISI, 
               VERGIDAIRESI, VERGINUMARASI, URL, EPOSTA, ULKE, BOLGE, TELULKEKODU, 
               TELEFON, FAXULKEKODU, FAX, MUSTERITEMSILCISI, SFID, FIYATNO, 
                ODEMEPLANID, NAKLIYESEKLIID, TESLIMSEKLIID, 
               KKTIPIID, ACIKLAMA
        FROM FIRMALAR 
        WHERE EKLEMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE()) 
           OR DEGISTIRMEZAMANI > DATEADD(day, -${config.sync.daysBack}, GETDATE())
        ORDER BY FIRMAID`;

      const localResult = await this.dbManager.executeLocalQuery(firmalarQuery);
      const firmalar = localResult.recordset;

      logger.info(`Found ${firmalar.length} firms to sync`);

      let insertCount = 0;
      let updateCount = 0;

      for (const firma of firmalar) {
        try {
          // Check if firm exists in cloud database
          const exists = await this.dbManager.checkRecordExists(
            this.dbManager.getCloudPool(),
            "FIRMALAR",
            "FIRMAID = @FIRMAID",
            { FIRMAID: firma.FIRMAID }
          );

          if (!exists) {
            // Insert new firm
            await this.insertFirma(firma);
            insertCount++;
          } else {
            // Update existing firm
            await this.updateFirma(firma);
            updateCount++;
          }
        } catch (error) {
          logger.error(`Error processing firm ${firma.FIRMAID}:`, error);
        }
      }

      logger.info(
        `Firmalar sync completed. Inserted: ${insertCount}, Updated: ${updateCount}`
      );
    } catch (error) {
      logger.error("Firmalar senkronizasyonu başarısız:", error);
      throw error;
    }
  }

  async insertFirma(firma) {
    const insertQuery = `
      INSERT INTO FIRMALAR
      (FIRMAID, FIRMATIPIID, FIRMAKODU, MUHASEBEKODU, UNVANI, YURTDISI, 
       VERGIDAIRESI, VERGINUMARASI, URL, EPOSTA, ULKE, BOLGE, TELULKEKODU, 
       TELEFON, FAXULKEKODU, FAX, MUSTERITEMSILCISI, SFID, FIYATNO, 
       ODEMEPLANID, NAKLIYESEKLIID, TESLIMSEKLIID, ACIKLAMA)
      VALUES 
      (@FIRMAID, @FIRMATIPIID, @FIRMAKODU, @MUHASEBEKODU, @UNVANI, @YURTDISI, 
       @VERGIDAIRESI, @VERGINUMARASI, @URL, @EPOSTA, @ULKE, @BOLGE, @TELULKEKODU, 
       @TELEFON, @FAXULKEKODU, @FAX, @MUSTERITEMSILCISI, @SFID, @FIYATNO, 
       @ODEMEPLANID, @NAKLIYESEKLIID, @TESLIMSEKLIID, @ACIKLAMA)`;

    await this.dbManager.executeCloudQuery(insertQuery, firma);
  }

  async updateFirma(firma) {
    const updateQuery = `
      UPDATE FIRMALAR SET
      FIRMATIPIID = @FIRMATIPIID, FIRMAKODU = @FIRMAKODU, MUHASEBEKODU = @MUHASEBEKODU, 
      UNVANI = @UNVANI, YURTDISI = @YURTDISI, VERGIDAIRESI = @VERGIDAIRESI, 
      VERGINUMARASI = @VERGINUMARASI, URL = @URL, EPOSTA = @EPOSTA, ULKE = @ULKE, 
      BOLGE = @BOLGE, TELULKEKODU = @TELULKEKODU, TELEFON = @TELEFON, 
      FAXULKEKODU = @FAXULKEKODU, FAX = @FAX, MUSTERITEMSILCISI = @MUSTERITEMSILCISI, 
      SFID = @SFID, FIYATNO = @FIYATNO, ODEMEPLANID = @ODEMEPLANID, 
      NAKLIYESEKLIID = @NAKLIYESEKLIID, TESLIMSEKLIID = @TESLIMSEKLIID, 
      ACIKLAMA = @ACIKLAMA
      WHERE FIRMAID = @FIRMAID`;

    await this.dbManager.executeCloudQuery(updateQuery, firma);
  }
}

export default EntitiesService;
