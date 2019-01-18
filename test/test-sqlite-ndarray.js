/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const shortid = require("shortid");
const sqLiteManager = require("../lib/sqlite-manager.js");
const sqliteInfoTable = require("../lib/sqlite-info-table.js");
// @ts-ignore
const packageJson = require("../package.json");
const helper = require("./helper.js");
const sqliteConstants = require("../lib/sqlite-constants.js");
const tdxSchemaList = require("./tdx-schema-list.js");

const testTimeout = 20000;

let dbMem;

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.should();

describe("sqlite-ndarray", function() {
    this.timeout(testTimeout);
});
