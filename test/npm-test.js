"use strict";

const sqliteUtils = require("../index.js");
const TDX_SCHEMA = {
  "schema": {
    "dataSchema": {
      "prop1": {
        "__tdxType": ["number"],
      },
      "prop2": {
        "__tdxType": ["number"],
      },
    },
    "uniqueIndex": [],
  },
};

let dbIter;
const testData = [];

sqliteUtils.openDatabase("", "memory", "w+")
    .then((db) => {
      dbIter = db
      return sqliteUtils.createDataset(db, TDX_SCHEMA);
    })
    .then(() => {
      for (let idx = 0; idx < 100; idx++) {
        testData.push({
          prop1: idx,
          prop2: 100 - idx - 1,
        });
      }
      return sqliteUtils.addData(dbIter, testData);
    })
    .then(() => {
      return sqliteUtils.getDatasetData(dbIter,
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
      console.log(result);
    });
  
