/**
 * @module
 * Stores functions used to create SQLite Statements.
 */
const sqliteConstants = require("./sqlite-constants.js");
const sqliteConverter = require("./sqlite-schema-converter.js");

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
 *   // returns
 *   // `UPDATE table SET "unique" = :a(unique) WHERE "unique" = :a(unique);`
 *   updateStatement([{"asc": "unique"}], {"unique": "TEXT"}, ["unique"]);
 */
exports.updateStatement = function(uniqueIndex, schema, dataRowKeys) {
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
exports.insertStatement = function(uniqueIndex, schema, dataRowKeys, upsert) {
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
