/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const sqliteInfoTable = require("../lib/sqlite-info-table.js");
const Promise = require("bluebird");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const sqlite3 = require("sqlite3");
const sqliteConstants = require("../lib/sqlite-constants.js");
const infoKeys = require("./key-list.js");
let db;

chai.use(chaiAsPromised);
chai.should();

Promise.promisifyAll(sqlite3);

describe("sqlite-info-table", function() {
  before("Create the dataset object", function(done) {
    db = new sqlite3.Database(":memory:", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
      if (error) done(error);
      else done();
    });
  });

  beforeEach("Delete the info table", function(done) {
    db.runAsync(`DROP TABLE IF EXISTS ${sqliteConstants.DATABASE_INFO_TABLE_NAME};`, [])
      .then(() => {
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("should create info table succeed", function() {
    return sqliteInfoTable.createInfoTable(db)
      .should.be.fulfilled;
  });

  it("should create info table succeed if info table already exists", function() {
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.createInfoTable(db);
      })
      .should.be.fulfilled;
  });

  it("should return the number of keys in INFO_KEYS_LIST after setInfoKeys execution", function() {
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.setInfoKeys(db, infoKeys.INFO_KEY_LIST);
      })
      .should.eventually.deep.equal({count: infoKeys.INFO_KEY_LIST.length - 1});
  });

  it("should return zero for an empty key after setInfoKey execution", function() {
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.setInfoKeys(db, [{}]);
      })
      .should.eventually.deep.equal({count: 0});
  });

  it("should return zero for an empty array after setInfoKey execution", function() {
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.setInfoKeys(db, []);
      })
      .should.eventually.deep.equal({count: 0});
  });

  it("should return the keys in INFO_KEYS_LIST after setInfoKeys and getInfoKeys execution", function() {
    let keyObject = {};
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.setInfoKeys(db, infoKeys.INFO_KEY_LIST);
      })
      .then(() => {
        const keyList = [];
        _.forEach(infoKeys.INFO_KEY_LIST, (value) => {
          const keys = _.keys(value);
          keyObject = _.assign(keyObject, value);
          if (keys.length) keyList.push(keys[0]);
        });

        return sqliteInfoTable.getInfoKeys(db, keyList);
      })
      .then((keys) => {
        let infoKeyObject = {};

        _.forEach(keys, (value) => {
          infoKeyObject = _.assign(infoKeyObject, value);
        });

        return Promise.resolve(infoKeyObject);
      })
      .should.eventually.deep.equal(keyObject);
  });

  it("should return an empty array of keys after setInfoKeys and getInfoKeys execution", function() {
    return sqliteInfoTable.createInfoTable(db)
      .then(() => {
        return sqliteInfoTable.setInfoKeys(db, []);
      })
      .then(() => {
        return sqliteInfoTable.getInfoKeys(db, []);
      })
      .should.eventually.deep.equal([]);
  });
});

// {
//   "baseType":"dataset",
//   "created":"2017-08-22T15:59:46.077Z",
//   "modified":"2017-09-12T10:26:33.667Z",
//   "tdxVersion":1,
//   "version":10,
//   "store":"dataset.S1iAEk5uW",
//   "shareMode":"pr",
//   "description":"Test is a dataste",
//   "sortName":"test 2",
//   "name":"Test 2",
//   "createdBy":"mereacre@gmail.com/tdx.nq-m.com",
//   "owner":"mereacre@gmail.com/tdx.nq-m.com",
//   "id":"Byg9eBAYuW",
//   "derived":{
//   },
//   "schemaDefinition":{
//      "parent":"dataset",
//      "version":0,
//      "displayName":"Test 2 - schema",
//      "complete":true,
//      "vocabularyId":"__vocab__",
//      "id":"Byg9eBAYuW",
//      "nonUniqueIndexes":[
//      ],
//      "uniqueIndex":[
//         {
//            "asc":"id"
//         }
//      ],
//      "dataSchema":{
//         "arr":[
//         ],
//         "id":{
//            "__tdxType":[
//               "string"
//            ]
//         }
//      },
//      "basedOn":[
//         "dataset"
//      ],
//      "noSpecialise":false,
//      "published":false,
//      "system":false
//   },
//   "permissiveShare":"r",
//   "indexInfo":{
//      "complete":"100%",
//      "progress":"building primary key ",
//      "error":""
//   },
//   "indexStatus":"built",
//   "system":false,
//   "meta":{
//      "test1":"isOK",
//      "test2":23
//   },
//   "importing":false,
//   "tags":[
//      "test1",
//      "test2",
//      "test3"
//   ],
//   "parents":[
//      "ByZMnZ2KMx"
//   ]
// }
