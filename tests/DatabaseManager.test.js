const { describe, beforeEach, afterEach, it, expect } = require('@jest/globals');
const DatabaseManager = require('../src/database/DatabaseManager.js');

describe("DatabaseManager", () => {
  let dbManager;

  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe("constructor", () => {
    test("should initialize with null pools", () => {
      expect(dbManager.localPool).toBeNull();
      expect(dbManager.cloudPool).toBeNull();
      expect(dbManager.isLocalConnected).toBeFalsy();
      expect(dbManager.isCloudConnected).toBeFalsy();
    });
  });

  describe("connection methods", () => {
    test("should have connectLocal method", () => {
      expect(typeof dbManager.connectLocal).toBe("function");
    });

    test("should have connectCloud method", () => {
      expect(typeof dbManager.connectCloud).toBe("function");
    });

    test("should have connectBoth method", () => {
      expect(typeof dbManager.connectBoth).toBe("function");
    });
  });

  describe("query methods", () => {
    test("should have executeQuery method", () => {
      expect(typeof dbManager.executeQuery).toBe("function");
    });

    test("should have executeLocalQuery method", () => {
      expect(typeof dbManager.executeLocalQuery).toBe("function");
    });

    test("should have executeCloudQuery method", () => {
      expect(typeof dbManager.executeCloudQuery).toBe("function");
    });

    test("should have checkRecordExists method", () => {
      expect(typeof dbManager.checkRecordExists).toBe("function");
    });
  });

  describe("utility methods", () => {
    test("should have close method", () => {
      expect(typeof dbManager.close).toBe("function");
    });

    test("should have getLocalPool method", () => {
      expect(typeof dbManager.getLocalPool).toBe("function");
    });

    test("should have getCloudPool method", () => {
      expect(typeof dbManager.getCloudPool).toBe("function");
    });
  });
});
