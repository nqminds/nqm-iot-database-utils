/**
 * Stores functions used to create SQLite Statements.
 * @module
 */
"use strict";

const sqliteConstants = require("./sqlite-constants.js");
const sqliteConverter = require("./sqlite-schema-converter.js");

/**
 * @param {UniqueIndex} uniqueIndex - The uniqueIndex.
 * @returns {Set<string>} The set of uniqueIndex columns.
 */
function makeUniqueIndexSet(uniqueIndex) {
  /** @type {Set<string>} */
  const uniqueIndexSet = new Set();
  for (const sortColumn of uniqueIndex) {
    const column = Object.values(sortColumn)[0];
    uniqueIndexSet.add(column);
  }
  return uniqueIndexSet;
}
/**
 * @global
 * @typedef  {Array<{string: string}>} UniqueIndex
 * Array of sort-order: column name, ie {"asc": "column1"} or {"desc": "col2"}
 */

/**
 * Makes an SQLite Statement for an update.
 *
 * If dataRowKeys is missing a column that is in the schema, it is not added
 * into the statement.
 * This is so an insert adds the SQLite Column default value, and if there is
 * an update, only the defined columns are changed.
 * @param {UniqueIndex} uniqueIndex - The uniqueIndex to upsert.
 * @param {object} schema - The schema of the database.
 * @param {Array<string>} dataRowKeys - The column names for the data row.
 * @returns {string} - The SQLite insert/upsert statement.
 *
 * @example
 * // returns
 * // `UPDATE table SET "unique" = :a(unique) WHERE "unique" = :a(unique);`
 * updateStatement([{"asc": "unique"}], {"unique": "TEXT"}, ["unique"]);
 */
module.exports.updateStatement = function(uniqueIndex, schema, dataRowKeys) {
  let updateStr = "";

  const schemaColumnsSet = new Set(Object.keys(schema));

  dataRowKeys.forEach((column) => {
    if (schemaColumnsSet.has(column)) {
      const escapedCol = sqliteConverter.escapeIdentifier(column);
      const namedParameter = sqliteConverter.makeNamedParameter(column);
      // "column_name = :a(column_name), "
      updateStr += `${escapedCol} = ${namedParameter}, `;
    } else {
      // I think current behavior is just to ignore errors but maybe we
      // should let SQLite throw the error
    }
  });
  // returns an empty string if there is nothing in there
  // else cuts out the last ", " (command and space)
  updateStr = updateStr.slice(0, -2);
  if (updateStr.length === 0) {
    throw new Error("No columns matching the schema were given.");
  }

  let sqlStatement = "UPDATE " +
    `${sqliteConstants.DATABASE_DATA_TABLE_NAME} ` +
    `SET ${updateStr}`;

  let conditionStr = "";
  uniqueIndex.forEach((uniqueIndexColumn) => {
    const column = Object.values(uniqueIndexColumn)[0]; // key is order
    if (!dataRowKeys.includes(column)) {
      throw Error(`The keys ${dataRowKeys} were given for an UPDATE ` +
        `statement but the unique index column ${column} was not specified.`);
    }
    const escapedCol = sqliteConverter.escapeIdentifier(column);
    const namedParameter = sqliteConverter.makeNamedParameter(column);
    conditionStr += `${escapedCol} = ${namedParameter}, `;
  });
  conditionStr = conditionStr.slice(0, -2);
  if (conditionStr.length === 0) {
    throw new Error("No uniqueIndex was given.");
  }
  sqlStatement += ` WHERE ${conditionStr}`;

  // finish SQLStatement
  sqlStatement += ";";
  return sqlStatement;
};

/**
 * Makes an SQLite Statement for an insertion.
 *
 * If dataRowKeys is missing a column that is in the schema, it is not added
 * into the statement.
 * This is so an insert adds the SQLite Column default value, and if there is
 * an update, only the defined columns are changed.
 * @param {UniqueIndex} uniqueIndex - The uniqueIndex to upsert.
 * @param {object} schema - The schema of the database.
 * @param {Array<string>} dataRowKeys - The column names for the data row.
 * @param {boolean} upsert - If true, updates if the data already exists.
 * @returns {string} - The SQLite insert/upsert statement.
 */
module.exports.insertStatement = (uniqueIndex, schema, dataRowKeys, upsert) => {
  let tableColumnStr = "";
  let sqliteValue = "";
  let updateStr = "";

  const schemaColumnsSet = new Set(Object.keys(schema));

  dataRowKeys.forEach((column) => {
    if (schemaColumnsSet.has(column)) {
      const escapedCol = sqliteConverter.escapeIdentifier(column);
      tableColumnStr += `${escapedCol}, `;
      sqliteValue += "?, ";
      updateStr += `${escapedCol}=excluded.${escapedCol}, `;
    } else {
      // I think current behavior is just to ignore errors but maybe we
      // should let SQLite throw the error
    }
  });
  // returns an empty string if there is nothing in there
  // else cuts out the last ", " (command and space)
  tableColumnStr = tableColumnStr.slice(0, -2);
  if (tableColumnStr.length === 0) {
    throw new Error("No columns matching the schema were given.");
  }
  sqliteValue = sqliteValue.slice(0, -2);
  updateStr = updateStr.slice(0, -2);

  let sqlStatement = "INSERT INTO " +
    `${sqliteConstants.DATABASE_DATA_TABLE_NAME}(${tableColumnStr}) ` +
    `VALUES(${sqliteValue})`;

  if (upsert) {
    let conflictStr = uniqueIndex.reduce( (string, column) => {
      const value = Object.values(column)[0];
      return `${string}${sqliteConverter.escapeIdentifier(value)}, `;
    }, "");
    conflictStr = conflictStr.slice(0, -2);
    if (conflictStr.length === 0) {
      throw new Error("No uniqueIndex was given.");
    }
    sqlStatement += ` ON CONFLICT(${conflictStr}) DO UPDATE SET ${updateStr}`;
  }

  // finish SQLStatement
  sqlStatement += ";";
  return sqlStatement;
};

/**
 * Makes an SQLite Statement for a deletion by primary key match.
 *
 * @param {UniqueIndex} uniqueIndex - The uniqueIndex to delete on.
 * @param {Array<string>} dataRowKeys - The order of the uniqueIndex columns.
 * @returns {string} - The SQLite deletion statement.
 */
module.exports.deleteStatement = function(uniqueIndex, dataRowKeys) {
  const uniqueIndexSet = makeUniqueIndexSet(uniqueIndex);

  const whereCond = []; // stores uniqueIndex columns
  const uselessCond = []; // useless non-uniqueIndex columns
  dataRowKeys.forEach((column, index) => {
    const cond = uniqueIndexSet.has(column) ? whereCond : uselessCond;
    // make parameter token in form ?NNN (https://www.sqlite.org/lang_expr.html)
    const parameter = `?${(index + 1).toString().padStart(3, "0")}`;
    cond.push(`${sqliteConverter.escapeIdentifier(column)} = ${parameter}`);
  });

  if (uniqueIndexSet.size === 0) {
    throw Error("Given uniqueIndex had no values in it." +
      ` uniqueIndex was '${uniqueIndex}'`);
  } else if (whereCond.length !== uniqueIndexSet.size) {
    const missing = [...uniqueIndexSet].filter((el) => {
      return !dataRowKeys.includes(el);
    });
    throw Error("Given dataRowKeys does not contain all columns that are in" +
      ` uniqueIndex. Missing values are '${missing}'`);
  }

  const whereString = whereCond.join(" AND ");
  let orString = "";
  if (uselessCond.length > 0) {
    // we add an always false condition to bind the useless columns to
    // this is slightly slower, but means we can reuse more code
    orString = `OR ( NULL NOTNULL AND ${uselessCond.join(" AND ")})`;
  }

  const sqlStatement = "DELETE FROM" +
    ` ${sqliteConstants.DATABASE_DATA_TABLE_NAME}` +
    ` WHERE ${whereString} ${orString};`;
  return sqlStatement;
};
