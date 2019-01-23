/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const fs = require("fs");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const nd = require("ndarray");
const del = require("del");
const sqliteNdarray = require("../lib/sqlite-ndarray.js");

// @ts-ignore
const packageJson = require("../package.json");

const testTimeout = 20000;

let bufferPath = process.argv[1];
const projectNameIdx = bufferPath.indexOf(packageJson.name);

bufferPath = `${bufferPath.substring(0, projectNameIdx) + packageJson.name}/test/db/buffer`;

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.should();

describe("sqlite-ndarray", function() {
  this.timeout(testTimeout);
  after(function() {
    del.sync(bufferPath);
  });

  beforeEach(function() {
    del.sync(bufferPath);
    fs.mkdirSync(bufferPath);
  });

  it("should return a meta object for a ndarray object (row - order, 2D, Float64)", function() {
    const array = nd(new Float64Array(2 * 3), [2, 3]);
    const meta = sqliteNdarray.getNdarrayMeta(array);
    const result = _.pick(meta, ["t", "s", "v", "f", "c"]);
    result.should.deep.equal({
      "t": "=f8",
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
      "t": "=b",
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
      "t": "=b",
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
        "data": nd(new Int8Array(4 * 5 * 6), [4, 5, 6], [1, 4, 20]),
      },
      {
        "timestamp": 1,
        "data": nd(new Float64Array(2 * 3), [2, 3]),
      }
    );

    const newData = sqliteNdarray.writeNdarrayMany({"dataFolder": bufferPath}, data, "data");
    for (const row of newData) {
      row["data"] = _.omit(row["data"], "p");
    }

    for (const row of data) {
      row["data"] = _.omit(sqliteNdarray.getNdarrayMeta(row["data"]), "p");
    }

    data.should.deep.equal(newData);
  });

  it("should write the ndarray documents to file", function() {
  });
});
