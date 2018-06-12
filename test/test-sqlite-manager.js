/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const shortid = require("shortid");
const builder = require("mongo-sql");
const sqLiteManager = require("../lib/sqlite-manager.js");
const sqliteInfoTable = require("../lib/sqlite-info-table.js");
const packageJson = require("../package.json");
const helper = require("./helper.js");
const sqliteConstants = require("../lib/sqlite-constants.js");
const tdxSchemaList = require("./tdx-schema-list.js");

const testTimeout = 20000;

let dbMem;

let databasePath = process.argv[1];
const projectNameIdx = databasePath.indexOf(packageJson.name);

databasePath = `${databasePath.substring(0, projectNameIdx) + packageJson.name}/test/db/create-dataset-test.db`;

chai.use(chaiAsPromised);
chai.should();

describe("sqlite-manager", function() {
  this.timeout(testTimeout);
  describe("openDatabase", function() {
    beforeEach(function() {
      helper.deleteFile(databasePath);
    });

    it("should database open fail if none exists", function() {
      return sqLiteManager.openDatabase(databasePath, "file", "r")
        .should.be.rejected;
    });

    it("should database create succeed", function() {
      let dbResult = {};
      return sqLiteManager.openDatabase(databasePath, "file", "w+")
        .then((db) => {
          dbResult = _.pick(db, ["open", "filename", "mode"]);
          return sqLiteManager.closeDatabase(db);
        })
        .then(() => {
          return Promise.resolve(dbResult);
        })
        .should.eventually.deep.equal({
          "open": true,
          "filename": databasePath,
          "mode": 6,
        });
    });

    it("should create and then open a database", function() {
      let dbResult = {};
      return sqLiteManager.openDatabase(databasePath, "file", "w+")
        .then((db) => {
          return sqLiteManager.closeDatabase(db);
        })
        .then(() => {
          return sqLiteManager.openDatabase(databasePath, "file", "rw");
        })
        .then((db) => {
          dbResult = _.pick(db, ["open", "filename", "mode"]);
          return sqLiteManager.closeDatabase(db);
        })
        .then(() => {
          return Promise.resolve(dbResult);
        })
        .should.eventually.deep.equal({
          "open": true,
          "filename": databasePath,
          "mode": 2,
        });
    });

    it("should create database -> create dataset -> close database -> open database -> return general schema", function() {
      let dbResult = {};
      return sqLiteManager.openDatabase(databasePath, "file", "w+")
        .then((db) => {
          dbResult = db;
          return sqLiteManager.createDataset(db, tdxSchemaList.TDX_SCHEMA_LIST[0]);
        })
        .then(() => {
          return sqLiteManager.closeDatabase(dbResult);
        })
        .then(() => {
          return sqLiteManager.openDatabase(databasePath, "file", "r");
        })
        .then(() => {
          return Promise.resolve(sqLiteManager.getGeneralSchema());
        })
        .should.eventually.deep.equal(tdxSchemaList.TDX_SCHEMA_LIST[0].generalSchema);
    });
  });

  describe("createDataset", function() {
    before("Create the dataset object", function(done) {
      sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbMem = db;
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    beforeEach("Delete the info and data tables", function(done) {
      dbMem.runAsync(`DROP TABLE IF EXISTS ${sqliteConstants.DATABASE_INFO_TABLE_NAME};`, [])
        .then(() => {
          return dbMem.runAsync(`DROP TABLE IF EXISTS ${sqliteConstants.DATABASE_DATA_TABLE_NAME};`, []);
        })
        .then(() => {
          return dbMem.runAsync(`DROP INDEX IF EXISTS ${sqliteConstants.DATABASE_TABLE_INDEX_NAME};`, []);
        })
        .then(() => {
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    it("should succeed if database empty", function() {
      let datasetId;
      return sqLiteManager.createDataset(dbMem, {})
        .then((id) => {
          datasetId = id;
          return sqliteInfoTable.getInfoKeys(dbMem, ["id"]);
        })
        .then((keys) => {
          return Promise.resolve(keys[0].id === datasetId);
        })
        .should.eventually.equal(true);
    });

    it("should succeed if there's an empty info table", function() {
      let datasetId;
      return sqliteInfoTable.createInfoTable(dbMem)
        .then(() => {
          return sqLiteManager.createDataset(dbMem, {});
        })
        .then((id) => {
          datasetId = id;
          return sqliteInfoTable.getInfoKeys(dbMem, ["id"]);
        })
        .then((keys) => {
          return Promise.resolve(keys[0].id === datasetId);
        })
        .should.eventually.equal(true);
    });

    it("should replace the existing data id with the generated one", function() {
      let datasetId;
      return sqliteInfoTable.createInfoTable(dbMem)
        .then(() => {
          return sqliteInfoTable.setInfoKeys(dbMem, [{"id": "12345"}]);
        })
        .then(() => {
          return sqLiteManager.createDataset(dbMem, {});
        })
        .then((id) => {
          datasetId = id;
          return sqliteInfoTable.getInfoKeys(dbMem, ["id"]);
        })
        .then((keys) => {
          return Promise.resolve(keys[0].id === datasetId);
        })
        .should.eventually.equal(true);
    });

    it("should create the data table based on a given schema", function() {
      return Promise.each(tdxSchemaList.TDX_SCHEMA_LIST, (entry) => {
        let dbIter;
        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            return dbIter.allAsync(`SELECT sql FROM sqlite_master WHERE name="${sqliteConstants.DATABASE_TABLE_INDEX_NAME}";`, []);
          })
          .then((fields) => {
            if (fields.length === 1 && entry["sqliteIndex"] !== "")
              return Promise.resolve((fields[0].sql === entry["sqliteIndex"]));
            else if (!fields.length && entry["sqliteIndex"] === "")
              return Promise.resolve(true);
            else return Promise.resolve(false);
          })
          .should.eventually.equal(true);
      });
    });

    it("should be rejected in invalid schema column names", function() {
      return Promise.each(tdxSchemaList.TDX_SCHEMA_LIST_ERROR, (entry) => {
        let dbIter;
        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .should.be.rejected;
      });
    });

    it("should fail if data table already exists", function() {
      return dbMem.runAsync(`CREATE TABLE ${sqliteConstants.DATABASE_DATA_TABLE_NAME}(a,b)`, [])
        .then(() => {
          return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0]);
        })
        .should.be.rejected;
    });

    it("should save the general schema", function() {
      return Promise.each(tdxSchemaList.TDX_SCHEMA_LIST, (entry) => {
        let dbIter;
        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            return Promise.resolve(sqLiteManager.getGeneralSchema());
          })
          .should.eventually.deep.equal(entry.generalSchema);
      });
    });
  });

  describe("addData", function() {
    it("should return the number of elements added", function() {
      let dataSize;

      return Promise.each(tdxSchemaList.TDX_SCHEMA_LIST, (entry) => {
        let dbIter;
        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            const generalSchema = sqLiteManager.getGeneralSchema();
            const data = generateRandomData(generalSchema, 1000);
            dataSize = data.length;
            return sqLiteManager.addData(dbIter, data);
          })
          .then((result) => {
            return dbIter.getAsync(`SELECT Count(*) AS count FROM ${sqliteConstants.DATABASE_DATA_TABLE_NAME}`, [])
              .then((row) => {
                return Promise.resolve(_.isEqual(row, {count: dataSize}) && _.isEqual(result, {count: dataSize}));
              });
          })
          .should.eventually.equal(true);
      });
    });

    it("should add strings with double quotes", function() {
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[11]; // Corresponds to Test 12 in tdx-schema-list.js
      let dbIter;
      let testData = [];
      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData = [{prop1: "test"}, {prop1: '"test"'}, {prop1: "\"test"}, {prop1: "'test'"}];
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return dbIter.allAsync(`SELECT * FROM ${sqliteConstants.DATABASE_DATA_TABLE_NAME}`, []);
        })
        .then((rows) => {
          let truth = (rows.length === testData.length);

          _.forEach(rows, (value, idx) => {
            truth = truth && _.isEqual(value, testData[idx]);
          });

          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });
  });

  describe("getDatasetData", function() {
    it("should return exactly the same element as inserted with non optimal search for object/array", function() {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[0];
      let testData = [];
      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          const generalSchema = sqLiteManager.getGeneralSchema();
          testData = generateRandomData(generalSchema, 1);

          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, null);
        })
        .then((result) => {
          const resultElement = result.data[0];
          const testElement = testData[0];
          let truth = !_.isEmpty(result.data[0]);

          _.forEach(resultElement, (value, key) => {
            if (_.isObject(testElement[key]))
              truth = truth && _.isEqual(testElement[key], value);
            else
              truth = truth && (testElement[key] === value);
          });
          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });

    it("should return the limit number of elements", function() {
      let dbIter;
      let testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const dataSize = 1234;
      const limit = 23;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          const generalSchema = sqLiteManager.getGeneralSchema();
          testData = generateRandomData(generalSchema, dataSize);

          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, {limit: limit});
        })
        .then((result) => {
          return Promise.resolve(result.data.length);
        })
        .should.eventually.equal(limit);
    });

    it("should return with no limit and skip", function() {
      let dbIter;
      let testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const dataSize = 100;
      const skip = 45;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          const generalSchema = sqLiteManager.getGeneralSchema();
          testData = generateRandomData(generalSchema, dataSize);

          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, {skip: skip});
        })
        .then((result) => {
          return Promise.resolve(result.data.length);
        })
        .should.eventually.equal(dataSize - skip);
    });

    it("should return with limit and skip", function() {
      let dbIter;
      let testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const dataSize = 100;
      const skip = 45;
      const limit = 70;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          const generalSchema = sqLiteManager.getGeneralSchema();
          testData = generateRandomData(generalSchema, dataSize);

          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, {limit: limit, skip: skip});
        })
        .then((result) => {
          return Promise.resolve(result.data.length);
        })
        .should.eventually.equal(dataSize - skip);
    });

    it("should order by ascending and descending", function() {
      let dbIter;
      let truth;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[12];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: shortid.generate(),
              prop2: Math.floor(Math.random() * dataSize) + 0,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, {sort: {prop1: -1}});
        })
        .then((result) => {
          truth = (result.data.length === testData.length);
          let initialValue = result.data[0];

          _.forEach(result.data, (value) => {
            truth = truth && (initialValue["prop1"] >= value["prop1"]);
            initialValue = value;
          });

          return sqLiteManager.getDatasetData(dbIter, null, null, {sort: {prop2: 1}});
        })
        .then((result) => {
          truth = truth && (result.data.length === testData.length);
          let initialValue = result.data[0];

          _.forEach(result.data, (value) => {
            truth = truth && (initialValue["prop2"] <= value["prop2"]);
            initialValue = value;
          });

          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });

    it("should return data with projection inclussion", function() {
      return Promise.each(tdxSchemaList.TDX_SCHEMA_LIST, (entry) => {
        let dbIter;
        let testData = [];
        let generalSchema = {};
        const projection = {};
        const schemaKeys = [];

        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            generalSchema = sqLiteManager.getGeneralSchema();
            testData = generateRandomData(generalSchema, 100);

            return sqLiteManager.addData(dbIter, testData);
          })
          .then(() => {
            _.forEach(generalSchema, (value, key) => {
              projection[key] = Math.floor(Math.random() * 2) + 0;
              if (projection[key]) schemaKeys.push(key);
            });
            return sqLiteManager.getDatasetData(dbIter, null, projection, {limit: 1});
          })
          .then((result) => {
            const dataKeys = _.keys(result.data[0]);
            let truth = (schemaKeys.length === dataKeys.length);

            _.forEach(schemaKeys, (value) => {
              truth = truth && (dataKeys.indexOf(value) >= 0);
            });

            return Promise.resolve(truth);
          })
          .should.eventually.equal(true);
      });
    });

    it("should filter data [TBD]", function() {
      let dbIter;
      let truth;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: idx,
              prop2: dataSize - idx - 1,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter,
            {$and: [{$or: [{prop1: {$gte: 2, $lte: 5}}, {prop1: {$gte: 92}}]}, {prop2: {$lte: 10}}]},
            null,
            {
              sort: {
                prop1: 1,
                prop2: -1,
              },
            });
        })
        .then((result) => {
          truth = (result.data.length === 8);

          _.forEach(result.data, (row) => {
            truth = truth && (row["prop1"] >= 92 && row["prop1"] <= 99) && (row["prop2"] >= 0 && row["prop2"] <= 7);
          });

          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });    
  });

  describe("truncateResource", function() {
    it("should truncate the dataset and return the number of rows truncated", function() {
      let dbIter;
      let truth;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: Math.floor(Math.random() * 2) + 0,
              prop2: Math.floor(Math.random() * 2) + 0,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.truncateResource(dbIter);
        })
        .then((result) => {
          truth = (result.count === dataSize);
          return sqLiteManager.getDatasetData(dbIter, null, null, null);
        })
        .then((result) => {
          truth = truth && !result.data.length;
          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });
  });

  describe("getDatasetDataCount", function() {
    it("should should return the total count of rows satisfying a filter", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: idx,
              prop2: dataSize - idx - 1,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {$and: [{$or: [{prop1: {$gte: 2, $lte: 5}}, {prop1: {$gte: 92}}]}, {prop2: {$lte: 10}}]}, null, null);
        })
        .should.eventually.deep.equal({count: 8});
    });
  });

  describe.only("updateDataByQuery", function() {
    it("should return zero count for an empty update object", function() {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {}, {});
        })
        .should.eventually.deep.equal({count: 0});
    });

    it("should update all entries for an empty query", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: idx,
              prop2: dataSize - idx - 1,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {}, {prop1: 0});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: 0}, null, null);
        })
        .should.eventually.deep.equal({count: 100});
    });

    it("should not update any entry for a non valid query", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: idx,
              prop2: dataSize - idx - 1,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {prop2: 101}, {prop1: 999});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: 999}, null, null);
        })
        .should.eventually.deep.equal({count: 0});
    });

    it("should update some entries for a non empty query", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          for (let idx = 0; idx < dataSize; idx++) {
            testData.push({
              prop1: idx,
              prop2: dataSize - idx - 1,
            });
          }
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {prop2: {$gte: 0, $lt: 50}}, {prop1: 999});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: 999}, null, null);
        })
        .should.eventually.deep.equal({count: 50});
    });

    it("should update some string entries for a non empty query", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[12];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData.push({prop1: "abc", prop2: 34});
          testData.push({prop1: "abc", prop2: 34354});
          testData.push({prop1: "abc", prop2: 67834});
          testData.push({prop1: "abc", prop2: 3345344});
          testData.push({prop1: "abc", prop2: 323534});
          testData.push({prop1: "bc", prop2: 340});
          testData.push({prop1: "bc", prop2: 343540});
          testData.push({prop1: "bc", prop2: 678340});
          testData.push({prop1: "bc", prop2: 33453440});
          testData.push({prop1: "bc", prop2: 3235340});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {$or: [{prop2: 34}, {prop2: 340}]}, {prop1: "baba"});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: "baba"}, null, null);
        })
        .should.eventually.deep.equal({count: 2});
    });    

    it("should update some string entries for a non empty query", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[12];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData.push({prop1: "abc", prop2: 34});
          testData.push({prop1: "abc", prop2: 34354});
          testData.push({prop1: "abc", prop2: 67834});
          testData.push({prop1: "abc", prop2: 3345344});
          testData.push({prop1: "abc", prop2: 323534});
          testData.push({prop1: "bc", prop2: 340});
          testData.push({prop1: "bc", prop2: 343540});
          testData.push({prop1: "bc", prop2: 678340});
          testData.push({prop1: "bc", prop2: 33453440});
          testData.push({prop1: "bc", prop2: 3235340});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {prop1: "abc", prop2: 34}, {prop1: "baba"});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: "baba", prop2: 34}, null, null);
        })
        .should.eventually.deep.equal({count: 1});
    });    

    it("should fail when updating a unique index with a duplicate value", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[2];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData.push({prop1: "a"});
          testData.push({prop1: "b"});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {prop1: "a"}, {prop1: "b"});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: "b"}, null, null);
        })
        .should.be.rejected;
    });

    it("should succed when updating a unique index with a non duplicate value", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[2];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData.push({prop1: "a"});
          testData.push({prop1: "b"});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.updateDataByQuery(dbIter, {prop1: "a"}, {prop1: "c"});
        })
        .then(() => {
          return sqLiteManager.getDatasetDataCount(dbIter, {prop1: "c"}, null, null);
        })
        .should.eventually.deep.equal({count: 1});
    });
  });

  function generateRandomData(schema, size) {
    const data = [];

    const numIterations = size || Math.floor(Math.random() * sqliteConstants.SQLITE_QUERY_LIMIT) + 1;

    for (let dataIdx = 0; dataIdx < numIterations; dataIdx++) {
      const dataElement = {};
      const objectIdx = Math.floor(Math.random() * (tdxSchemaList.TDX_SCHEMA_LIST.length - 1)) + 0;

      _.forEach(schema, (value, key) => {
        switch (value) {
          case sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT:
            dataElement[key] = tdxSchemaList.TDX_SCHEMA_LIST[objectIdx];
            break;
          case sqliteConstants.SQLITE_GENERAL_TYPE_ARRAY:
            dataElement[key] = [dataIdx, 2, 3, 4, 5, 6, "test", {a: 1, b: "test"}];
            break;
          case sqliteConstants.SQLITE_TYPE_NUMERIC:
          case sqliteConstants.SQLITE_TYPE_INTEGER:
            dataElement[key] = dataIdx;
            break;
          case sqliteConstants.SQLITE_TYPE_REAL:
            dataElement[key] = dataIdx;
            break;
          case sqliteConstants.SQLITE_TYPE_TEXT:
            dataElement[key] = shortid.generate() + dataIdx.toString();
            break;
          default:
        }
      });
      data.push(dataElement);
    }
    return data;
  }
});

