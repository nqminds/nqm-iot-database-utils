/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require("deep-equal-in-any-order");
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
    del.sync(databaseFolder, {force: true});
  });

  beforeEach(function() {
    del.sync(databaseFolder, {force: true});
    fs.mkdirSync(databaseFolder, {recursive: true});
  });

  it("should return a meta object for a ndarray object (row - order, 2D, Float64)", function() {
    const meta = sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "buffer", [2, 3]);
    const result = _.pick(meta, ["t", "s", "v", "c"]);
    result.should.deep.equal({
      "t": "<B",
      "s": [2, 3],
      "v": "f",
      "c": true,
    });
  });

  it("should return a meta object for a ndarray object (row - order, 0D, Int8)", function() {
    const meta = sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "int8");
    const result = _.pick(meta, ["t", "s", "v", "c"]);
    result.should.deep.equal({
      "t": "<b",
      "s": [0],
      "v": "f",
      "c": true,
    });
  });

  it("should return a meta object for a ndarray object (column - order, 3D, Int8)", function() {
    const meta = sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false);
    const result = _.pick(meta, ["t", "s", "v", "c"]);
    result.should.deep.equal({
      "t": "<b",
      "s": [4, 5, 6],
      "v": "f",
      "c": false,
    });
  });

  it("should return the modified ndarray documents", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
      },
      {
        "timestamp": 2,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 3,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
      },
      {
        "timestamp": 4,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      },
      {
        "timestamp": 5,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
      },
      {
        "timestamp": 6,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
      }
    );

    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data")
      .then((newData) => {
        const fileNames = [];
        for (const row of newData)
          fileNames.push(row["data"].p);
        const unique = new Set(fileNames);
        return Promise.resolve((newData.length === 7) && (unique.size === 7));
      })
      .should.eventually.equal(true);
  });

  it("should write the ndarray documents to file (one per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
      },
      {
        "timestamp": 2,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 3,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
      },
      {
        "timestamp": 4,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      },
      {
        "timestamp": 5,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
      },
      {
        "timestamp": 6,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
      }
    );

    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data")
      .then((newData) => {
        const readData = [];
        for (const row of newData) {
          const filePath = path.join(databaseFolder, row["data"]["p"]);
          const bufferSize = sqliteNdarray.getTypedBufferSize(row["data"]["t"], row["data"]["s"]);
          const fileBuffer = Buffer.alloc(bufferSize);
          const bytesRead = helper.readFile(filePath, fileBuffer, fileBuffer.length);
          readData.push(bytesRead);
        }

        const sizeData = [];
        for (const row of data)
          sizeData.push(row.data.data.length);

        return Promise.resolve(JSON.stringify(sizeData) === JSON.stringify(readData));
      })
      .should.eventually.equal(true);
  });

  it("should write the ndarray documents to file (multiple per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 1,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 2,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      },
      {
        "timestamp": 3,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
      },
      {
        "timestamp": 4,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "float32", [1, 2, 3, 4]),
      },
      {
        "timestamp": 5,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
      },
      {
        "timestamp": 6,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      }
    );
    const dataKeys = ["data1", "data2", "data3"];

    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, dataKeys)
      .then((newData) => {
        const readData = [];
        for (const row of newData) {
          let bytesRead;
          const sizeRow = [];
          for (const key of dataKeys) {
            const filePath = path.join(databaseFolder, row[key]["p"]);
            const bufferSize = sqliteNdarray.getTypedBufferSize(row[key]["t"], row[key]["s"]);
            const fileBuffer = Buffer.alloc(bufferSize);
            bytesRead = helper.readFile(filePath, fileBuffer, fileBuffer.length);

            sizeRow.push(bytesRead);
          }
          readData.push(sizeRow);
        }

        const sizeData = [];
        for (const row of data) {
          const sizeRow = [];
          for (const key of dataKeys)
            sizeRow.push(row[key].data.length);
          sizeData.push(sizeRow);
        }
        return Promise.resolve(JSON.stringify(sizeData) === JSON.stringify(readData));
      })
      .should.eventually.equal(true);
  });

  it("should read the ndarray documents from file (one per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
      },
      {
        "timestamp": 1,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
      },
      {
        "timestamp": 2,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 3,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
      },
      {
        "timestamp": 4,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      },
      {
        "timestamp": 5,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
      },
      {
        "timestamp": 6,
        "data": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
      }
    );

    let newData = [];

    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data")
      .then((result) => {
        newData = result;
        return sqliteNdarray.readNdarrayMany({"dataFolder": databaseFolder}, newData, "data");
      })
      .then((readData) => {
        for (const row of newData) {
          row["data"] = _.omit(row["data"], ["p", "data"]);
        }

        for (const row of readData) {
          const meta = sqliteNdarray.getNdarrayMeta(row["data"].data, row["data"].dtype, row["data"].shape, row["data"].major, row["data"].ftype);
          row["data"] = _.omit(meta, ["p", "data"]);
        }

        return Promise.resolve(JSON.stringify(readData) === JSON.stringify(newData));
      })
      .should.eventually.equal(true);
  });

  it("should read the ndarray documents from file (multiple per document)", function() {
    const data = [];
    data.push(
      {
        "timestamp": 0,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 1,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(0), "uint16", [0]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
      },
      {
        "timestamp": 2,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(23 * 56), "uint32", [23, 56]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      },
      {
        "timestamp": 3,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(4 * 5 * 6), "int8", [4, 5, 6], false),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
      },
      {
        "timestamp": 4,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "float32", [1, 2, 3, 4]),
      },
      {
        "timestamp": 5,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(123 * 567), "int32", [123, 567]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
      },
      {
        "timestamp": 6,
        "data1": sqliteNdarray.getNdarrayMeta(Buffer.alloc(2 * 3), "float64", [2, 3]),
        "data2": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1 * 2 * 3 * 4), "uint8", [1, 2, 3, 4]),
        "data3": sqliteNdarray.getNdarrayMeta(Buffer.alloc(1), "int16", [1]),
      }
    );

    const dataKeys = ["data1", "data2", "data3"];
    let newData = [];
    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, dataKeys)
      .then((result) => {
        newData = result;
        return sqliteNdarray.readNdarrayMany({"dataFolder": databaseFolder}, newData, dataKeys);
      })
      .then((readData) => {
        for (const row of newData) {
          for (const key of dataKeys)
            row[key] = _.omit(row[key], ["p", "data"]);
        }

        for (const row of readData) {
          for (const key of dataKeys) {
            const meta = sqliteNdarray.getNdarrayMeta(row[key].data, row[key].dtype, row[key].shape, row[key].major, row[key].ftype);
            row[key] = _.omit(meta, ["p", "data"]);
          }
        }
        return Promise.resolve(JSON.stringify(readData) === JSON.stringify(newData));
      })
      .should.eventually.equal(true);
  });

  it("should read the same elemenst as written in ndarray documents (one per document)", function() {
    const data = [];
    let size = [];
    let length = 0;
    const sizes = [];
    const lengths = [];
    const arrays = [];

    const sizeToLength = (size) => (size.reduce((a, b) => (a * b)));

    size = [1, 2, 3, 4];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Uint8Array(length));

    size = [0];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Uint16Array(length));

    size = [23, 56];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Uint32Array(length));

    size = [4, 5, 6];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Int8Array(length));

    size = [1];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Int16Array(length));

    size = [123, 567];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Int32Array(length));

    size = [2, 3];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Float32Array(length));

    size = [2, 3];
    length = sizeToLength(size);
    sizes.push(size);
    lengths.push(length);
    arrays.push(new Float64Array(length));

    for (let idx = 0; idx < 7; idx++) {
      length = lengths[idx];
      for (let j = 0; j < length; j++)
        arrays[idx][j] = j;
    }

    data.push(
      {
        "timestamp": 0,
        "dtype": "uint8",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[0].buffer), "uint8", sizes[0]),
      },
      {
        "timestamp": 1,
        "dtype": "uint16",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[1].buffer), "uint16", sizes[1]),
      },
      {
        "timestamp": 2,
        "dtype": "uint32",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[2].buffer), "uint32", sizes[2]),
      },
      {
        "timestamp": 3,
        "dtype": "int8",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[3].buffer), "int8", sizes[3], false),
      },
      {
        "timestamp": 4,
        "dtype": "int16",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[4].buffer), "int16", sizes[4]),
      },
      {
        "timestamp": 5,
        "dtype": "int32",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[5].buffer), "int32", sizes[5]),
      },
      {
        "timestamp": 6,
        "dtype": "float32",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[6].buffer), "float32", sizes[6]),
      },
      {
        "timestamp": 7,
        "dtype": "float64",
        "data": sqliteNdarray.getNdarrayMeta(Buffer.from(arrays[7].buffer), "float64", sizes[7]),
      }
    );

    let newData = [];
    sqliteNdarray.writeNdarrayMany({"dataFolder": databaseFolder}, data, "data")
      .then((result) => {
        newData = result;
        return sqliteNdarray.readNdarrayMany({"dataFolder": databaseFolder}, newData, "data");
      })
      .then((readData) => {
        let truth = true;
        for (let idx = 0; idx < data.length; idx++) {
          const writeBuffer = data[idx].data.data;
          const readBuffer = readData[idx].data.data;
          const typedWrite = sqliteNdarray.getTypedArrayFromBuffer(writeBuffer, data[idx].dtype);
          const typedRead = sqliteNdarray.getTypedArrayFromBuffer(readBuffer, readData[idx].dtype);
          truth = truth && (typedWrite.length === typedRead.length);
          if (!truth) break;

          for (let j = 0; j < writeBuffer.length; j++)
            truth = truth && (typedWrite[j] === typedRead[j]);
        }

        return Promise.resolve(truth);
      })
      .should.eventually.equal(true);
  });
});
