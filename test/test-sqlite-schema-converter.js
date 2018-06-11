/* eslint-env mocha */
"use strict";

const _ = require("lodash");
const sqliteConverter = require("../lib/sqlite-schema-converter.js");
const tdxSchemaList = require("./tdx-schema-list.js");

describe("sqlite-schema-converter", function() {
  describe("convertSchema", function() {
    it("should return empty for an empty input", function() {
      const ret = sqliteConverter.convertSchema({});
      ret.should.deep.equal({});
    });

    it("should return the converted schema for every element in tdx-schema-list", function() {
      _.forEach(tdxSchemaList.TDX_SCHEMA_LIST, (entry) => {
        const convertedSchema = sqliteConverter.convertSchema(entry["schema"].dataSchema);
        const sqlSchema = sqliteConverter.mapSchema(convertedSchema);
        sqlSchema.should.deep.equal(entry.sqliteSchema);
      });
    });
  });
});
