/**
 * Module to manage the info table.
 * @module sqlite-info-table
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

module.exports = (function() {
  "use strict";

  const _ = require("lodash");
  const Promise = require("bluebird");
  const sqliteConstants = require("./sqlite-constants.js");
  const sqliteConverter = require("./sqlite-schema-converter.js");
  const sqliteHelper = require("./sqlite-helper.js");

  const info = {};

  /**
   * Creates the info table.
   * @function
   * @alias module:sqlite-info-table.createInfoTable
   * @param {object} db - The sqlite3 db object from module node-sqlite3
   * @returns {object} - The empty promise or error
   */
  info.createInfoTable = function(db) {
    return info.checkInfoTable(db)
      .then((check) => {
        if (!check) return db.runAsync(`CREATE TABLE ${sqliteConstants.DATABASE_INFO_TABLE_NAME} (key text PRIMARY KEY,value text);`, []);
        else return Promise.resolve({});
      });
  };

  /**
   * Sets the object keys for the info table.
   * @function
   * @alias module:sqlite-info-table.setInfoKeys
   * @param {object} db - The sqlite3 db object from module node-sqlite3
   * @param {object[]} keys - The object keys to be save in the info table
   * @returns {object} - The promise with the total number of keys saved or error
   */
  info.setInfoKeys = function(db, keys) {
    const data = [];
    const replaceQuery = "REPLACE INTO info (key,value) VALUES(?,?)";

    _.forEach(keys, (valueInfo) => {
      let keyValuePair = [];
      _.forEach(valueInfo, (value, key) => {
        const sqlValidKey = sqliteConverter.convertToSqlite(sqliteConstants.SQLITE_TYPE_TEXT, key, {onlyStringify: true});
        const sqlValidValue = sqliteConverter.convertToSqlite(sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT, value, {onlyStringify: true});

        keyValuePair = [sqlValidKey, sqlValidValue];
      });

      if (keyValuePair.length)
        data.push(keyValuePair);
    });

    return sqliteHelper.executeInsert(db, replaceQuery, data);
  };

  /**
   * Returns the object keys for the info table.
   * @function
   * @alias module:sqlite-info-table.getInfoKeys
   * @param {object} db - The sqlite3 db object from module node-sqlite3
   * @param {string[]} keys - The named keys to be retrieved from the info table
   * @returns {object[]} - The promise with array of pairs of key/value or error
   */
  info.getInfoKeys = function(db, keys) {
    const selectQuery = "SELECT key,value FROM info WHERE ";
    const keyValuePairs = [];
    const queryData = [];
    let whereQuery = "";

    _.forEach(keys, (key, idx) => {
      if (key !== "") {
        const orProp = (idx < keys.length - 1) ? " OR " : ";";
        const sqlValidKey = sqliteConverter.convertToSqlite(sqliteConstants.SQLITE_TYPE_TEXT, key, {onlyStringify: true});
        whereQuery += `key=?${orProp}`;

        queryData.push(sqlValidKey);
      }
    });

    if (whereQuery !== "") {
      return db.allAsync(selectQuery + whereQuery, queryData)
        .then((rows) => {
          _.forEach(rows, (pairObject) => {
            const keyValue = {};
            keyValue[pairObject["key"]] = sqliteConverter.convertToTdx(sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT, pairObject["value"]);
            keyValuePairs.push(keyValue);
          });

          return Promise.resolve(keyValuePairs);
        });
    }

    // @ts-ignore
    return Promise.resolve(keyValuePairs);
  };

  /**
   * Checks if info table exists.
   * @function
   * @alias module:sqlite-info-table.checkInfoTable
   * @param {object} db - The sqlite3 db object from module node-sqlite3
   * @returns {object} - The promise with true or false
   */
  info.checkInfoTable = function(db) {
    return db.allAsync("SELECT name FROM sqlite_master WHERE type='table'", [])
      .then((rows) => {
        const search = _.find(rows, {"name": sqliteConstants.DATABASE_INFO_TABLE_NAME});
        if (search === undefined)
          return Promise.resolve(false);
        else return Promise.resolve(true);
      });
  };

  return info;
}());
