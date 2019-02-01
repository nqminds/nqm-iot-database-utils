# nqm-iot-database-utils [![npm version](https://badge.fury.io/js/nqm-iot-database-utils.svg)](https://badge.fury.io/js/nqm-iot-database-utils)[![Build Status](https://travis-ci.org/nqminds/nqm-iot-database-utils.svg?branch=master)](https://travis-ci.org/nqminds/nqm-iot-database-utils)

nquiringminds IoT Database utilities (sqlite implementation for now)

## Install
```cmd
npm install nqm-iot-database-utils
```

## Test
```cmd
npm test
```

## Build Documentation

```cmd
npm run docs
```

### nodejs
```js
const sqliteUtils = require("nqm-iot-database-utils");
```

# Usage
## Example 1
The below example will do the following steps:
1. Create a sqlite database in memory with [```openDatabase```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
2. Create a dataset with two fields with [```createDataset```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
3. Add 100 documents to the dataset with [```addData```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
4. Retrieve a list documents for a given filter with [```getData```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)

```js
"use strict";

const sqliteUtils = require("nqm-iot-database-utils");
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
      return sqliteUtils.getData(dbIter,
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
```

## Example 2
The below example will add an ndarray to the dataset:
1. Create a sqlite database in memory with [```openDatabase```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
2. Create a dataset with two fields with [```createDataset```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
3. Add 1 documents to the dataset with [```addData```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)
4. Retrieve the documents with [```getData```](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)

```js
"use strict";

const sqliteUtils = require("nqm-iot-database-utils");
const TDX_SCHEMA = {
  "schema": {
    "dataSchema": {
      "timestamp": {
        "__tdxType": ["number"],
      },
      "array": {
        "__tdxType": ["ndarray"],
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
      const array = new Float64Array(23 * 34);
      array.fill(-1.8934579345);
      arrayData = sqliteUtils.getNdarrayMeta(Buffer.from(array.buffer), "float64", [23, 34]);
      return sqliteUtils.addData(dbIter, {timestamp: 123456789, array: arrayData});
    })
    .then(() => {
      return sqliteUtils.getData(dbIter, null, null, null, null);
    })
    .then((result) => {
      const row = result.data[0];
      const floatBuffer = sqliteUtils.getTypedArrayFromBuffer(row.array.data, "float64");
      console.log(floatBuffer);
    });
```

# [API](https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html)

- Online Website <https://nqminds.github.io/nqm-iot-database-utils/module-sqlite-manager.html>
- Local Markdown [`./docs/api.md`](./docs/api.md)

