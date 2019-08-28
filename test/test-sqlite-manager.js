/* eslint-env mocha */
"use strict";

const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const del = require("del");
const Promise = require("bluebird");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require("deep-equal-in-any-order");
const shortid = require("shortid");
const tempDir = require("temp-dir");
const sqLiteManager = require("../lib/sqlite-manager.js");
const sqliteInfoTable = require("../lib/sqlite-info-table.js");
const sqliteNdarray = require("../lib/sqlite-ndarray.js");
// @ts-ignore
const packageJson = require("../package.json");
const helper = require("./helper.js");
const sqliteConstants = require("../lib/sqlite-constants.js");
const tdxSchemaList = require("./tdx-schema-list.js");

const testTimeout = 20000;

let dbMem;

let databasePath = process.argv[1];
const projectNameIdx = databasePath.indexOf(packageJson.name);
const databaseFolder = `${databasePath.substring(0, projectNameIdx) + packageJson.name}/test/db`;
databasePath = `${databaseFolder}/create-dataset-test.db`;

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.should();

describe("sqlite-manager", function() {
  this.timeout(testTimeout);
  before(function() {
    const tmpFolderName = sqliteConstants.DATABASE_DATA_TMP_NAME + sqliteConstants.DATABASE_FOLDER_SUFFIX;
    del.sync(path.join(tempDir, tmpFolderName), {force: true});
    fs.mkdirSync(databaseFolder);
  });

  after(function() {
    const dbFile = path.basename(databasePath);
    const dbPath = path.dirname(databasePath);
    const tmpFolderName = sqliteConstants.DATABASE_DATA_TMP_NAME + sqliteConstants.DATABASE_FOLDER_SUFFIX;
    del.sync(path.join(dbPath, dbFile + sqliteConstants.DATABASE_FOLDER_SUFFIX));
    helper.deleteFile(databasePath);
    del.sync(databaseFolder);
    del.sync(path.join(tempDir, tmpFolderName), {force: true});
  });

  describe("openDatabase", function() {
    beforeEach(function() {
      const dbFile = path.basename(databasePath);
      const dbPath = path.dirname(databasePath);
      del.sync(path.join(dbPath, dbFile + sqliteConstants.DATABASE_FOLDER_SUFFIX));
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

    it("should create the data folder on database create (file mode)", function() {
      return sqLiteManager.openDatabase(databasePath, "file", "w+")
        .then(() => {
          const dbFile = path.basename(databasePath);
          const dbPath = path.dirname(databasePath);
          const dataPath = path.join(dbPath, dbFile + sqliteConstants.DATABASE_FOLDER_SUFFIX);

          return Promise.resolve(fs.existsSync(dataPath));
        })
        .should.eventually.equal(true);
    });

    it("should create the data folder on database create (memory mode)", function() {
      return sqLiteManager.openDatabase("", "memory", "w+")
        .then(() => {
          const dataFolderName = sqliteConstants.DATABASE_DATA_TMP_NAME + sqliteConstants.DATABASE_FOLDER_SUFFIX;
          const dataFolderPath = path.join(tempDir, dataFolderName);

          return Promise.resolve(fs.existsSync(dataFolderPath));
        })
        .should.eventually.equal(true);
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
          dbResult = _.pick(db, ["open", "filename", "mode", "dataFolder"]);
          return sqLiteManager.closeDatabase(db);
        })
        .then(() => {
          return Promise.resolve(dbResult);
        })
        .should.eventually.deep.equal({
          "open": true,
          "filename": databasePath,
          "mode": 2,
          "dataFolder": path.join(path.dirname(databasePath), path.basename(databasePath) +
                        sqliteConstants.DATABASE_FOLDER_SUFFIX),
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
        .then((db) => {
          return sqLiteManager.getGeneralSchema(db);
        })
        .should.eventually.deep.equal(tdxSchemaList.TDX_SCHEMA_LIST[0].generalSchema);
    });
  });

  describe("createDataset", function() {
    beforeEach("Create the dataset object", async () => {
      dbMem = await sqLiteManager.openDatabase("", "memory", "w+");
    });

    afterEach("Close the dataset object", async () => {
      if (dbMem) {
        await dbMem.close();
        dbMem = null;
      }
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

    it("should fail if there's an empty info table", function() {
      return sqliteInfoTable.createInfoTable(dbMem)
        .then(() => {
          return sqLiteManager.createDataset(dbMem, {});
        })
        .should.be.rejected;
    });

    it("should fail when replacing the existing data id with the generated one", function() {
      return sqliteInfoTable.createInfoTable(dbMem)
        .then(() => {
          return sqliteInfoTable.setInfoKeys(dbMem, [{"id": "12345"}]);
        })
        .then(() => {
          return sqLiteManager.createDataset(dbMem, {});
        })
        .should.be.rejected;
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
            if (fields.length === 1 && entry.sqliteIndex !== "")
              return Promise.resolve((fields[0].sql === entry.sqliteIndex));
            else if (!fields.length && entry.sqliteIndex === "")
              return Promise.resolve(true);
            else return Promise.resolve(false);
          })
          .should.eventually.equal(true);
      });
    });

    it("should succeed if executing createDataset in a sequence with the same schemas", function() {
      return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0])
        .then(() => {
          return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0]);
        })
        .should.be.fulfilled;
    });

    it("should fail if executing createDataset in a sequence with the different schemas", function() {
      return sqLiteManager.createDataset(dbMem, {})
        .then(() => {
          return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0]);
        })
        .should.be.rejected;
    });

    it("should not change the dataset id if executing createDataset in a sequence with the same schemas", function() {
      let firstId;
      return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0])
        .then((id) => {
          firstId = id;
          return sqLiteManager.createDataset(dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0]);
        })
        .then((id) => {
          return Promise.resolve((firstId === id));
        })
        .should.eventually.equal(true);
    });

    it("should fail if index doesn't match schema", function() {
      const options = _.cloneDeep(tdxSchemaList.TDX_SCHEMA_LIST[0]);

      options.schema.dataSchema = {};

      return sqLiteManager.createDataset(dbMem, options)
        .should.be.rejected;
    });

    it("should not rewrite the general schema when opening two datasets", function() {
      const entryFirst = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const entrySecond = tdxSchemaList.TDX_SCHEMA_LIST[1];
      let dbFirst;
      let generalSchemaFirst;
      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbFirst = db;
          return sqLiteManager.createDataset(dbFirst, entryFirst);
        })
        .then(async () => {
          generalSchemaFirst = _.cloneDeep(
            await sqLiteManager.getGeneralSchema(dbFirst));
          return sqLiteManager.openDatabase("", "memory", "w+");
        })
        .then((db) => {
          return sqLiteManager.createDataset(db, entrySecond);
        })
        .then(async () => {
          return Promise.resolve(_.isEqual(generalSchemaFirst,
            await sqLiteManager.getGeneralSchema(dbFirst)));
        })
        .should.eventually.equal(true);
    });

    it("should close only one database when opening two and closing one", async () => {
      const entryFirst = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const entrySecond = tdxSchemaList.TDX_SCHEMA_LIST[1];
      const dbFirst = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(dbFirst, entryFirst);
      const dbSecond = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(dbSecond, entrySecond);

      await sqLiteManager.closeDatabase(dbSecond);
      // first db should still work now
      const data = generateRandomData(
        await sqLiteManager.getGeneralSchema(dbFirst), 10);
      await sqLiteManager.addData(dbFirst, data);
      const loadedData = (await sqLiteManager.getData(dbFirst)).data;
      chai.assert.sameDeepMembers(data, loadedData);
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

    it("should fail if invalid unique index", async function() {
      await dbMem.runAsync(`CREATE TABLE ${sqliteConstants.DATABASE_DATA_TABLE_NAME}(a,b)`, []);
      const validSchema = {...tdxSchemaList.TDX_SCHEMA_LIST[0]};
      validSchema.schema = {...validSchema.schema}; // make a copy we can change
      validSchema.schema.uniqueIndex = [{}]; // empty unique index
      return sqLiteManager.createDataset(dbMem, validSchema).should.be.rejected;
    });

    it("should fail if data table already exists", async () => {
      await dbMem.runAsync(
        `CREATE TABLE ${sqliteConstants.DATABASE_DATA_TABLE_NAME}(a,b)`, []);
      //console.log(await sqLiteManager.getGeneralSchema(dbMem));
      return sqLiteManager.createDataset(
        dbMem, tdxSchemaList.TDX_SCHEMA_LIST[0]).should.be.rejected;
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
            return sqLiteManager.getGeneralSchema(dbIter);
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
          .then(async () => {
            const generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
    it("should fail when adding duplicate unique index", function() {
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
          return sqLiteManager.addData(dbIter, {prop1: "a"});
        })
        .should.be.rejected;
    });

    it("should succeed when adding non-duplicate unique index", function() {
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
          return sqLiteManager.addData(dbIter, {prop1: "c"});
        })
        .should.eventually.be.fulfilled;
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
        .then(async () => {
          const generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
        .then(async () => {
          const generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
        .then(async () => {
          const generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
        .then(async () => {
          const generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
            truth = truth && (initialValue.prop1 >= value.prop1);
            initialValue = value;
          });

          return sqLiteManager.getDatasetData(dbIter, null, null, {sort: {prop2: 1}});
        })
        .then((result) => {
          truth = truth && (result.data.length === testData.length);
          let initialValue = result.data[0];

          _.forEach(result.data, (value) => {
            truth = truth && (initialValue.prop2 <= value.prop2);
            initialValue = value;
          });

          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });

    it("should return data with projection on ndarray", function() {
      let dbIter;
      let testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[16];
      let generalSchema = {};
      const projection = {};
      const schemaKeys = [];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(async () => {
          generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
          testData = generateRandomData(generalSchema, 100);
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          _.forEach(generalSchema, (value, key) => {
            projection[key] = 1;
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

    it("should return the same ndarray as written", function() {
      let dbIter;
      let writeData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[16];
      let truth = true;
      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(async () => {
          writeData = generateRandomData(
            await sqLiteManager.getGeneralSchema(dbIter), 1);
          return sqLiteManager.addData(dbIter, writeData);
        })
        .then(() => {
          return sqLiteManager.getDatasetData(dbIter, null, null, null);
        })
        .then((result) => {
          const writeNdData = sqliteNdarray.getNdarrayData(writeData[0].arrayData.data, writeData[0].arrayData);
          const readNdData = result.data[0].arrayData;
          truth = _.isEqual(readNdData.shape, writeNdData.shape) && (readNdData.dtype === writeNdData.dtype) &&
                    (readNdData.major === writeNdData.major) && (readNdData.ftype === writeNdData.ftype) &&
                    (readNdData.data.length === writeNdData.data.length);

          for (let idx = 0; idx < readNdData.data.length; idx++)
            truth = truth && (readNdData.data[idx] === writeNdData.data[idx]);
          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });

    it("should return data with projection inclusion (random projection selection)", function() {
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
          .then(async () => {
            generalSchema = await sqLiteManager.getGeneralSchema(dbIter);
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
            truth = truth && (row.prop1 >= 92 && row.prop1 <= 99) && (row.prop2 >= 0 && row.prop2 <= 7);
          });

          return Promise.resolve(truth);
        })
        .should.eventually.equal(true);
    });

    it("should return nqmMeta", async function() {
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[13];
      const dataSize = 100;

      const dbIter = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(dbIter, entry);
      for (let idx = 0; idx < dataSize; idx++) {
        testData.push({
          prop1: idx,
          prop2: dataSize - idx - 1,
        });
      }
      await sqLiteManager.addData(dbIter, testData);
      const data = await sqLiteManager.getDatasetData(dbIter,
        null,
        null,
        {nqmMeta: true});
      chai.expect(data).to.have.property("metaData");
      const metaData = data.metaData;
      chai.expect(metaData).to.have.all.keys(
        ["description", "id", "name", "parents", "schemaDefinition", "tags", "meta"]);
    });

    /**
     * Fixes #32.
     */
    it("should work even when require cache is not used", async function() {
      /**
       * Loads a Node.js module without using the existing cached version.
       * From luff at https://stackoverflow.com/a/16060619
       */
      function requireUncached(moduleName){
        delete require.cache[require.resolve(moduleName)];
        return require(moduleName);
      }
      const otherSqliteManager = requireUncached("../lib/sqlite-manager.js");
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[0];
      const db = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(db, entry);
      const generalSchema = await sqLiteManager.getGeneralSchema(db);
      chai.assert.deepEqual(
        // load general schema using other sqlite manager
        await otherSqliteManager.getGeneralSchema(db), generalSchema);

      const testData = generateRandomData(generalSchema, 1);
      await sqLiteManager.addData(db, testData);
      const loadedData = (await otherSqliteManager.getData(db)).data;
      chai.assert.sameDeepMembers(loadedData, testData);
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
          return sqLiteManager.getDatasetDataCount(dbIter, {$and: [{$or: [{prop1: {$gte: 2, $lte: 5}}, {prop1: {$gte: 92}}]}, {prop2: {$lte: 10}}]});
        })
        .should.eventually.deep.equal({count: 8});
    });
  });

  describe("getResource", function() {
    it("should return the a resource for each database", function() {
      tdxSchemaList.TDX_SCHEMA_LIST.forEach( (entry) => {
        let dbIter;
        const resource = sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(async () => {
            const resource = await sqLiteManager.getResource(dbIter);
            return resource;
          });
        resource.should.eventually.have.property("id");
        resource.should.eventually.have.property("name");
        resource.should.eventually.have.property("description");
        resource.should.eventually.have.property("parents");
        resource.should.eventually.have.property("schemaDefinition");
        resource.should.eventually.have.property("tags");
        resource.should.eventually.not.have.property("super_fake_random_prop");
      });
    });

    it("should return the name and description if they are defined",
      function() {
        const entry = tdxSchemaList.TDX_SCHEMA_LIST[14];
        let dbIter;
        const resource = sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(async () => {
            const resource = await sqLiteManager.getResource(dbIter);
            return resource;
          });
        const expected = (({name, description, tags}) => ({
          name, description, tags}))(entry);
        resource.should.eventually.deep.include(expected);
      });

    it("should be rejected if the db is invalid",
      function() {
        const dbIter = {};
        const resource = sqLiteManager.getResource(dbIter);
        return chai.assert.isRejected(resource);
      });
  });

  describe("updateData", () => {
    it("if throws is false, should return a CommandResult object on failure",
      () => {
        let dbIter;
        const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
        const throws = false;
        const upsert = true;

        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            return sqLiteManager.updateData(dbIter, [{}], upsert, throws);
          }).should.eventually.have.all.keys("commandId", "response", "result");
      });
    it("if throws is true, adding invalid data should cause an exception",
      () => {
        let dbIter;
        const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
        const throws = true;
        const upsert = true;

        return sqLiteManager.openDatabase("", "memory", "w+")
          .then((db) => {
            dbIter = db;
            return sqLiteManager.createDataset(dbIter, entry);
          })
          .then(() => {
            return sqLiteManager.updateData(dbIter, [{}], upsert, throws);
          }).should.be.rejected;
      });
      it("Adding invalid should fail but the next call should continue working",
        () => {
          let dbIter;
          const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
          const throws = true;
          const upsert = true;

          const data = [{prop1: 42, prop2: 42, prop3: 43}]
          return sqLiteManager.openDatabase("", "memory", "w+")
            .then((db) => {
              dbIter = db;
              return sqLiteManager.createDataset(dbIter, entry);
            })
            .then(() => {
              return sqLiteManager.updateData(dbIter, [{}], upsert, throws);
            }).catch(() => {
              // should have an error
              return;
            }).then(() => {
              return sqLiteManager.updateData(
                dbIter, data, upsert, throws);
            }).then(() => {
              return sqLiteManager.getData(dbIter);
            }).should.eventually.deep.contain({data: data});
        });
  it("if upsert is true, adding new primary key data should be like an " +
    "insert",
    () => {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
      const throws = true;
      const upsert = true;

      const testData = [];

      for (let idx = 0; idx < 10; idx++) {
        testData.push({
          prop1: idx,
          prop2: 0,
          prop3: 0,
        });
      }

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.updateData(dbIter, testData, upsert, throws);
        }).then(() => {
          return sqLiteManager.getData(dbIter);
        }).should.eventually.deep.contain({data: testData});
    });
    it("if upsert is false, updating with new primary key data should do nothing",
    () => {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
      const throws = true;
      const upsert = false;

      const testData = [];

      for (let idx = 0; idx < 10; idx++) {
        testData.push({
          prop1: idx,
          prop2: 0,
          prop3: 0,
        });
      }

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.updateData(dbIter, testData, upsert, throws);
        }).then(() => {
          return sqLiteManager.getData(dbIter);
        }).then( (response) => {
          return chai.expect(response.data).to.be.empty;
        });
    });
    it("Inserting data with the same unique index should update existing " +
      "data",
      () => {
        let dbIter;
        const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
        const throws = true;

        const testData = [];

        for (let idx = 0; idx < 10; idx++) {
          testData.push({
            prop1: idx,
            prop2: 0,
            prop3: 0,
          });
        }

        const upserts = [false, true];
        return Promise.all(upserts.map((upsert) => {
          return sqLiteManager.openDatabase("", "memory", "w+")
            .then((db) => {
              dbIter = db;
              return sqLiteManager.createDataset(dbIter, entry);
            })
            .then(() => {
              return sqLiteManager.updateData(dbIter, testData, upsert, throws);
            })
            .then(() => {
              testData[4].prop2 = 12345678;
              return sqLiteManager.updateData(dbIter, testData, upsert, throws);
            })
            .then(() => {
              return sqLiteManager.getData(dbIter);
            }).should.eventually.deep.contain({data: testData});
        }));
      });
    it("Updating partial data should only update those fields", () => {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[15];
      const throws = true;
      const upsert = true;

      const testData = [];

      for (let idx = 0; idx < 10; idx++) {
        testData.push({
          prop1: idx,
          prop2: 0,
          prop3: 1,
        });
      }

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.updateData(dbIter, testData, upsert, throws);
        })
        .then(() => {
          testData[4].prop2 = 12345678;
          const dataToInsert = [{
            prop1: testData[4].prop1,
            prop2: testData[4].prop2,
            // no prop3
          }];
          return sqLiteManager.updateData(dbIter, dataToInsert, upsert, throws);
        })
        .then(() => {
          return sqLiteManager.getData(dbIter);
        }).should.eventually.deep.contain({data: testData});
    });
  });

  describe("deleteData", () => {
    const schema = tdxSchemaList.TDX_SCHEMA_LIST[0];
    let testData = [];
    it("should do nothing with no data", async () => {
      const db = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(db, schema);
      const randomData = generateRandomData(
        await sqLiteManager.getGeneralSchema(db), 10);
      testData = testData.concat(randomData);
      await sqLiteManager.addData(db, testData);
      await sqLiteManager.deleteData(db, []);
      return (await sqLiteManager.getData(db)).data.should.deep.equalInAnyOrder(
        testData);
    });
    it("should delete one data row", async () => {
      const db = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(db, schema);
      await sqLiteManager.addData(db, testData);
      await sqLiteManager.deleteData(db, testData[0]);
      const expectedData = testData.slice(1);
      return (await sqLiteManager.getData(db)).data.should.deep.equalInAnyOrder(
        expectedData);
    });
    it("should delete multiple data rows", async () => {
      const db = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(db, schema);
      await sqLiteManager.addData(db, testData);
      const dataToDelete = [];
      const dataToKeep = [];
      for (let i = 0; i < testData.length; i++) {
        if (i % 2) dataToDelete.push(testData[i]);
        else dataToKeep.push(testData[i]);
      }
      await sqLiteManager.deleteData(db, dataToDelete);
      return (await sqLiteManager.getData(db)).data.should.deep.equalInAnyOrder(
        dataToKeep);
    });
    it("should error if deleting row without all primary keys defined",
      async () => {
        const db = await sqLiteManager.openDatabase("", "memory", "w+");
        await sqLiteManager.createDataset(db, schema);
        await sqLiteManager.addData(db, testData);
        const dataToDelete = [];
        const dataToKeep = [];
        for (let i = 0; i < testData.length; i++) {
          if (i % 2) dataToDelete.push(testData[i]);
          else dataToKeep.push(testData[i]);
        }
        return sqLiteManager.deleteData(db, [{"TEST": 1}]).should.be.rejected;
      }
    );
    it("deleting data should allow reinsertion", async () => {
      const db = await sqLiteManager.openDatabase("", "memory", "w+");
      await sqLiteManager.createDataset(db, schema);
      await sqLiteManager.addData(db, testData);
      const dataToDelete = [];
      const dataToKeep = [];
      for (let i = 0; i < testData.length; i++) {
        if (i % 2) dataToDelete.push(testData[i]);
        else dataToKeep.push(testData[i]);
      }
      const p1 = sqLiteManager.addData(db, dataToDelete); // should fail
      await p1.catch((e) => true); // make sure data is inserted now
      await sqLiteManager.deleteData(db, dataToDelete);
      const p2 = sqLiteManager.addData(db, dataToDelete); // should suceed
      await p2.catch();
      return Promise.all([
        p1.should.be.rejected,
        p2.should.eventually.contain({"count": 5}),
        (await sqLiteManager.getData(db)).data.should.deep.equalInAnyOrder(testData),
      ]);
    });
  });

  describe("updateDataByQuery", function() {
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

    it("should succeed when updating a unique index with a non duplicate value", function() {
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

  describe("getDistinct", function() {
    it("should return an empty list for an empty dataset", function() {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[2];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.getDistinct(dbIter, "prop1", {});
        })
        .then((data) => {
          return Promise.resolve(data.length);
        })
        .should.eventually.deep.equal(0);
    });

    it("should return early for an empty projection", function() {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[2];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.getDistinct(dbIter, "", {});
        })
        .then((data) => {
          return Promise.resolve(data.length);
        })
        .should.eventually.deep.equal(0);
    });

    it("should return early for a false projection", function() {
      let dbIter;
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[2];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          return sqLiteManager.getDistinct(dbIter, "test", {});
        })
        .then((data) => {
          return Promise.resolve(data.length);
        })
        .should.eventually.deep.equal(0);
    });

    it("should return all keys for a present index", function() {
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
          testData.push({prop1: "c"});
          testData.push({prop1: "d"});
          testData.push({prop1: "e"});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDistinct(dbIter, "prop1", {});
        })
        .then((data) => {
          return Promise.resolve((data.length === 5) && (data.indexOf("a") >= 0) && (data.indexOf("e") >= 0));
        })
        .should.eventually.deep.equal(true);
    });

    it("should return list of distinct keys if there's no index present", function() {
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
          return sqLiteManager.getDistinct(dbIter, "prop1", {});
        })
        .then((data) => {
          return Promise.resolve(data.length);
        })
        .should.eventually.deep.equal(2);
    });

    it("should return list of distinct keys for a given filter", function() {
      let dbIter;
      const testData = [];
      const entry = tdxSchemaList.TDX_SCHEMA_LIST[12];

      return sqLiteManager.openDatabase("", "memory", "w+")
        .then((db) => {
          dbIter = db;
          return sqLiteManager.createDataset(dbIter, entry);
        })
        .then(() => {
          testData.push({prop1: "abcf", prop2: 1});
          testData.push({prop1: "abc", prop2: 2});
          testData.push({prop1: "abcf", prop2: 3});
          testData.push({prop1: "abc", prop2: 4});
          testData.push({prop1: "abc", prop2: 5});
          testData.push({prop1: "bcc", prop2: 6});
          testData.push({prop1: "bcc", prop2: 7});
          testData.push({prop1: "bc", prop2: 8});
          testData.push({prop1: "bc", prop2: 9});
          testData.push({prop1: "bcd", prop2: 10});
          return sqLiteManager.addData(dbIter, testData);
        })
        .then(() => {
          return sqLiteManager.getDistinct(dbIter, "prop1", {$or: [{prop2: {$gte: 4, $lte: 5}}, {prop2: {$gte: 8, $lte: 9}}]});
        })
        .then((data) => {
          return Promise.resolve((data.indexOf("abc") >= 0) && (data.indexOf("bc") >= 0) && data.length === 2);
        })
        .should.eventually.deep.equal(true);
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
          case sqliteConstants.SQLITE_GENERAL_TYPE_NDARRAY:
            const array = new Float64Array(23 * 34);
            array.fill(-1.8934579345);
            dataElement[key] = sqliteNdarray.getNdarrayMeta(Buffer.from(array.buffer), "float64", [23, 34]);
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
