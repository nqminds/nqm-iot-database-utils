/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const nd = require("ndarray");
const del = require("del");
const sqliteNdarray = require("../lib/sqlite-ndarray.js");

// @ts-ignore
const packageJson = require("../package.json");
const helper = require("./helper.js");

const testTimeout = 20000;

const projectNameIdx = process.argv[1].indexOf(packageJson.name);
const databaseFolder = `${process.argv[1].substring(0, projectNameIdx) + packageJson.name}/test/db`;

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.should();

describe("sqlite-ndarray", function() {
  this.timeout(testTimeout);
  after(function() {
    del.sync(databaseFolder);
  });

  beforeEach(function() {
    del.sync(databaseFolder);
    fs.mkdirSync(databaseFolder);
  });

  it("should return a meta object for a ndarray object (row - order, 2D, Float64)", function() {
    const array = nd(new Float64Array(2 * 3), [2, 3]);
    const meta = sqliteNdarray.getNdarrayMeta(array);
    const result = _.pick(meta, ["t", "s", "v", "f", "c"]);
    result.should.deep.equal({
      "t": "<f8",
      "s": array.shape,
      "v": "f",
      "c": true,
    });
  });

  it("should return a meta object for a ndarray object (row - order, 0D, Int8)", function() {
    const array = nd(new Int8Array(0), [0]);
    const meta = sqliteNdarray.getNdarrayMeta(array);
    const result = _.pick(meta, ["t", "s", "v", "f", "c"]);
    result.should.deep.equal({
      "t": "<b",
      "s": array.shape,
      "v": "f",
      "c": true,
    });
  });

  it("should return a meta object for a ndarray object (column - order, 3D, Int8)", function() {
    const array = nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]);
    const meta = sqliteNdarray.getNdarrayMeta(array);
    const result = _.pick(meta, ["t", "s", "v", "f", "c"]);
    result.should.deep.equal({
      "t": "<b",
      "s": array.shape,
      "v": "f",
      "c": false,
    });
  });

  it("should return the modified ndarray documents", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": nd(new Uint16Array(0), [0]),
      },
      {
        "timestamp": 2,
        "data": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 3,
        "data": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
      },
      {
        "timestamp": 4,
        "data": nd(new Int16Array(1), [1]),
      },
      {
        "timestamp": 5,
        "data": nd(new Int32Array(123 * 567), [123, 567]),
      },
      {
        "timestamp": 6,
        "data": nd(new Float64Array(2 * 3), [2, 3]),
      }
    );

    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data");
    const fileNames = [];
    for (const row of newData)
      fileNames.push(row["data"].p);
    const unique = new Set(fileNames);

    unique.size.should.equal(data.length);
    newData.should.have.length(data.length);
  });

  it("should write the ndarray documents to file (one per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": nd(new Uint16Array(0), [0]),
      },
      {
        "timestamp": 2,
        "data": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 3,
        "data": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
      },
      {
        "timestamp": 4,
        "data": nd(new Int16Array(1), [1]),
      },
      {
        "timestamp": 5,
        "data": nd(new Int32Array(123 * 567), [123, 567]),
      },
      {
        "timestamp": 6,
        "data": nd(new Float64Array(2 * 3), [2, 3]),
      }
    );

    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data");
    const readData = [];

    for (const row of newData) {
      const filePath = path.join(databaseFolder, row["data"]["p"]);
      const buffer = sqliteNdarray.getTypedArray(row["data"]["t"], row["data"]["s"]);
      const bytesRead = helper.readFile(filePath, buffer, Buffer.byteLength(buffer));
      readData.push({
        "bytesRead": bytesRead,
        "bufferSize": Buffer.byteLength(buffer),
      });
    }

    const sizeData = [];
    for (const row of data) {
      sizeData.push({
        "bytesRead": Buffer.byteLength(row.data.data),
        "bufferSize": Buffer.byteLength(row.data.data),
      });
    }

    JSON.stringify(sizeData).should.equal(JSON.stringify(readData));
  });

  it("should write the ndarray documents to file (multiple per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data1": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data2": nd(new Uint16Array(0), [0]),
        "data3": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 1,
        "data1": nd(new Uint16Array(0), [0]),
        "data2": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
        "data3": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 2,
        "data1": nd(new Uint32Array(23 * 56), [23, 56]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int16Array(1), [1]),
      },
      {
        "timestamp": 3,
        "data1": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int32Array(123 * 567), [123, 567]),
      },
      {
        "timestamp": 4,
        "data1": nd(new Int16Array(1), [1]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Float32Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
      },
      {
        "timestamp": 5,
        "data1": nd(new Int32Array(123 * 567), [123, 567]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Float64Array(2 * 3), [2, 3]),
      },
      {
        "timestamp": 6,
        "data1": nd(new Float64Array(2 * 3), [2, 3]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int16Array(1), [1]),
      }
    );
    
    const dataKeys = ["data1", "data2", "data3"];
    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, dataKeys);
    const readData = [];

    for (const row of newData) {
      let buffer;
      let bytesRead;
      const sizeRow = [];
      for (const key of dataKeys) {
        const filePath = path.join(databaseFolder, row[key]["p"]);
        buffer = sqliteNdarray.getTypedArray(row[key]["t"], row[key]["s"]);
        bytesRead = helper.readFile(filePath, buffer, Buffer.byteLength(buffer));
        sizeRow.push([bytesRead, Buffer.byteLength(buffer)]);
      }
      readData.push(sizeRow);
    }

    const sizeData = [];
    for (const row of data) {
      const sizeRow = [];
      for (const key of dataKeys)
        sizeRow.push([Buffer.byteLength(row[key].data), Buffer.byteLength(row[key].data)]);
      sizeData.push(sizeRow);
    }

    JSON.stringify(sizeData).should.equal(JSON.stringify(readData));
  });

  it("should read the ndarray documents from file (one per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": nd(new Uint16Array(0), [0]),
      },
      {
        "timestamp": 2,
        "data": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 3,
        "data": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
      },
      {
        "timestamp": 4,
        "data": nd(new Int16Array(1), [1]),
      },
      {
        "timestamp": 5,
        "data": nd(new Int32Array(123 * 567), [123, 567]),
      },
      {
        "timestamp": 6,
        "data": nd(new Float64Array(2 * 3), [2, 3]),
      }
    );

    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data");
    const readData = sqliteNdarray.readNdarrayMany({"dataFolder": databaseFolder}, newData, "data");

    for (const row of newData) {
      row["data"] = _.omit(row["data"], "p");
    }

    for (const row of readData) {
      const meta = sqliteNdarray.getNdarrayMeta(row["data"]);
      row["data"] = _.omit(meta, "p");
    }

    JSON.stringify(newData).should.equal(JSON.stringify(readData));
  });

  it("should read the ndarray documents from file (one per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data1": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data2": nd(new Uint16Array(0), [0]),
        "data3": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 1,
        "data1": nd(new Uint16Array(0), [0]),
        "data2": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
        "data3": nd(new Uint32Array(23 * 56), [23, 56]),
      },
      {
        "timestamp": 2,
        "data1": nd(new Uint32Array(23 * 56), [23, 56]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int16Array(1), [1]),
      },
      {
        "timestamp": 3,
        "data1": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int32Array(123 * 567), [123, 567]),
      },
      {
        "timestamp": 4,
        "data1": nd(new Int16Array(1), [1]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Float32Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
      },
      {
        "timestamp": 5,
        "data1": nd(new Int32Array(123 * 567), [123, 567]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Float64Array(2 * 3), [2, 3]),
      },
      {
        "timestamp": 6,
        "data1": nd(new Float64Array(2 * 3), [2, 3]),
        "data2": nd(new Uint8Array(1 * 2 * 3 * 4), [1, 2, 3, 4]),
        "data3": nd(new Int16Array(1), [1]),
      }
    );

    const dataKeys = ["data1", "data2", "data3"];
    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, dataKeys);
    const readData = sqliteNdarray.readNdarrayMany({"dataFolder": databaseFolder}, newData, dataKeys);

    for (const row of newData) {
      for (const key of dataKeys)
        row[key] = _.omit(row[key], "p");
    }

    for (const row of readData) {
      for (const key of dataKeys) {
        const meta = sqliteNdarray.getNdarrayMeta(row[key]);
        row[key] = _.omit(meta, "p");
      }
    }

    JSON.stringify(newData).should.equal(JSON.stringify(readData));
  });
});
