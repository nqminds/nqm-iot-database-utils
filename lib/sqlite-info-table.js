/**
 * Module to manage the info table.
 * @module sqlite-info-table
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

"use strict";

const sqliteConstants = require("./sqlite-constants.js");
const sqliteConverter = require("./sqlite-schema-converter.js");
const sqliteHelper = require("./sqlite-helper.js");

/**
 * Creates the info table.
 * @function
 * @alias module:sqlite-info-table.createInfoTable
 * @param {object} db - The sqlite3 db object from module node-sqlite3
 * @returns {object} - The error promise
 */
exports.createInfoTable = function(db) {
  return db.runAsync(
    `CREATE TABLE ${sqliteConstants.DATABASE_INFO_TABLE_NAME} (key text PRIMARY KEY,value text);`, []);
};

/**
 * Sets the object keys for the info table.
 * @function
 * @alias module:sqlite-info-table.setInfoKeys
 * @param {object} db - The sqlite3 db object from module node-sqlite3
 * @param {Object<string, any>[]} keys
 *   The object keys to be save in the info table
 * @returns {Promise<{count: number}>} - The count of the keys added.
 */
exports.setInfoKeys = async function(db, keys) {
  const data = [];
  const replaceQuery = "REPLACE INTO info (key,value) VALUES(?,?)";

  keys.forEach((valueInfo) => {
    let keyValuePair = [];
    for (const [key, value] of Object.entries(valueInfo)) {
      const sqlValidKey = sqliteConverter.convertToSqlite(
        sqliteConstants.SQLITE_TYPE_TEXT, key, {onlyStringify: true});
      const sqlValidValue = sqliteConverter.convertToSqlite(
        sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT, value, {onlyStringify: true});

      keyValuePair = [sqlValidKey, sqlValidValue];
    }

    if (keyValuePair.length)
      data.push(keyValuePair);
  });

  await sqliteHelper.executeMany(db, () => {
    return replaceQuery;
  }, data);
  return {
    "count": data.length};
};

/**
 * Returns the object keys for the info table.
 * @function
 * @alias module:sqlite-info-table.getInfoKeys
 * @param {object} db - The sqlite3 db object from module node-sqlite3
 * @param {string[]} keys - The named keys to be retrieved from the info table
 * @returns {Promise<object[]>}
 *   The promise with array of pairs of key/value or error
 */
exports.getInfoKeys = async function(db, keys) {
  const selectQuery = "SELECT key,value FROM info WHERE ";
  /** @type {Object<string, any>[]} */
  const keyValuePairs = [];
  const queryData = [];
  let whereQuery = "";

  keys.forEach((key, idx) => {
    if (key !== "") {
      const orProp = (idx < keys.length - 1) ? " OR " : ";";
      const sqlValidKey = sqliteConverter.convertToSqlite(
        sqliteConstants.SQLITE_TYPE_TEXT, key, {onlyStringify: true});
      whereQuery += `key=?${orProp}`;

      queryData.push(sqlValidKey);
    }
  });

  if (whereQuery === "") {
    // keys is empty. Shouldn't we raise an error in this case?
    return keyValuePairs;
  }

  const rows = await db.allAsync(selectQuery + whereQuery, queryData);
  rows.forEach(({key, value}) => {
    const keyValue = {};
    keyValue[key] = sqliteConverter.convertToTdx(
      sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT, value);
    keyValuePairs.push(keyValue);
  });

  return keyValuePairs;
};

/**
 * Checks if info table exists.
 * @function
 * @alias module:sqlite-info-table.checkInfoTable
 * @param {object} db - The sqlite3 db object from module node-sqlite3
 * @returns {Promise<boolean>} - The promise with true or false
 */
exports.checkInfoTable = async function(db) {
  const rows = await db.allAsync(
    "SELECT name FROM sqlite_master WHERE type='table'", []);
  const search = rows.find(
    (x) => x.name === sqliteConstants.DATABASE_INFO_TABLE_NAME);
  return search !== undefined;
};
