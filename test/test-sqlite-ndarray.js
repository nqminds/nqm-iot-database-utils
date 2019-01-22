/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const nd = require("ndarray");
const sqliteNdarray = require("../lib/sqlite-ndarray.js");

const testTimeout = 20000;

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.should();

describe("sqlite-ndarray", function() {
  this.timeout(testTimeout);
  it("should return a meta object for a ndarray object", function() {
    const array = nd(new Float64Array(2 * 3), [2, 3]);
    const meta = sqliteNdarray.getNdarrayMeta(array);
    const result = _.pick(meta, ["t", "s", "v", "f", "c"]);
    result.should.deep.equal({
      "t": "=f8",
      "s": array.shape,
      "v": "f",
      "c": array.stride,
    });
  });
});

