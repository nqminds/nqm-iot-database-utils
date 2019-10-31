/**
 * Module to convert a tdx schema into a sqlite schema.
 * @module sqlite-schema-converter
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */
"use strict";

const _ = require("lodash");
const sqliteConstants = require("./sqlite-constants.js");

/**
 * Returns a basic sqlite type from an array of tdx types.
 * @function
 * @param {string[]} tdxTypes - The array of tdx types
 * @returns {string} - The sqlite basic type
 */
module.exports.getBasicType = function(tdxTypes) {
  let tdxBaseType = tdxTypes[0] || "";
  let tdxDerivedType = tdxTypes[1] || "";

  // Transform the types to a lower and upper standard forms
  if (typeof tdxBaseType === "string") {
    tdxBaseType = tdxBaseType.toLowerCase();
  }

  if (typeof tdxDerivedType === "string") {
    tdxDerivedType = tdxDerivedType.toUpperCase();
  }

  // Check the base tdx type
  switch (tdxBaseType) {
    case sqliteConstants.TDX_TYPE_STRING:
      return sqliteConstants.SQLITE_TYPE_TEXT;
    case sqliteConstants.TDX_TYPE_BOOLEAN:
      return sqliteConstants.SQLITE_TYPE_NUMERIC;
    case sqliteConstants.TDX_TYPE_DATE:
      return sqliteConstants.SQLITE_TYPE_NUMERIC;
    case sqliteConstants.TDX_TYPE_NUMBER:
      if (tdxDerivedType.indexOf(sqliteConstants.TDX_TYPE_INT) >= 0) {
        return sqliteConstants.SQLITE_TYPE_INTEGER;
      } else if (new RegExp(sqliteConstants.TDX_TYPE_REAL).test(tdxDerivedType)) {
        return sqliteConstants.SQLITE_TYPE_REAL;
      } else {
        return sqliteConstants.SQLITE_TYPE_NUMERIC;
      }
    case sqliteConstants.TDX_TYPE_NDARRAY:
      return sqliteConstants.SQLITE_GENERAL_TYPE_NDARRAY;
  }

  // If no type specified return the default text type
  return sqliteConstants.SQLITE_TYPE_TEXT;
};

/**
 * Maps a general sqlite schema type into a valid sqlite schema.
 * @function
 * @alias module:sqlite-schema-converter.mapSchema
 * @param {object} types - The general sqlite schema type
 * @returns {object} - The mapped valid sqlite schema
 */
module.exports.mapSchema = function(types) {
  const sqliteSchema = {};

  _.forEach(types, (value, key) => {
    switch (value) {
      case sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT:
      case sqliteConstants.SQLITE_GENERAL_TYPE_ARRAY:
      case sqliteConstants.SQLITE_GENERAL_TYPE_NDARRAY:
        sqliteSchema[key] = sqliteConstants.SQLITE_TYPE_TEXT;
        break;
      default:
        sqliteSchema[key] = value;
        break;
    }
  });

  return sqliteSchema;
};

/**
 * Converts a tdx schema into a sqlite schema.
 * @function
 * @alias module:sqlite-schema-converter.convertSchema
 * @param {object} schema - The tdx schema
 * @returns {object} - The sqlite schema
 */
module.exports.convertSchema = function(schema) {
  const sqliteSchema = {};

  _.forEach(schema, (value, key) => {
    // Check if the type is an array, an object or a basic type
    if (_.isArray(value)) {
      sqliteSchema[key] = sqliteConstants.SQLITE_GENERAL_TYPE_ARRAY;
    } else if (!_.isArray(value) && _.isObject(value)) {
      if (Object.prototype.hasOwnProperty.call(value, sqliteConstants.TDX_TYPE_NAME)) {
        sqliteSchema[key] = module.exports.getBasicType(value[sqliteConstants.TDX_TYPE_NAME]);
      } else {
        sqliteSchema[key] = sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT;
      }
    }
  });

  return sqliteSchema;
};

/**
 * Escapes an SQLite Identifier, e.g. a column name.
 *
 * This will prevent SQLite injections, and column names being incorrectly
 * classified as string literal values.
 *
 * Mixing up the quotes can cause unexpected behaviour, since SQLite guesses
 * whether something is a column-name or a variable.
 *
 * @function
 * @alias module:sqlite-schema-converter.escapeIdentifier
 * @param {string} identifier The identifier to quote.
 * @returns {string} The escaped and double-quoted identifier
 * @example
 *   // using back-ticks as JS quote character to avoid confusion
 *   // returns `"hello""cheeseburg'er"`
 *   converter.escapeIdentifier(`hello"cheeseburg'er`);
 */
module.exports.escapeIdentifier = function(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
};

/**
 * Escapes the first character of the string using HTML standard.
 *
 * Unlike encodeURIComponent(), this encodes all characters.
 * @param {string} charToEscape A string of length 1
 * @returns {string} The escaped URI character.
 * @example
 *   // returns "%4A"
 *   escapeURIchar("J");
 */
function escapeURIchar(charToEscape) {
  return `%${charToEscape.codePointAt(0).toString(16)}`;
}

/**
 * Create a parameter for use in bind variables to SQLite statements.
 *
 * This creates a 1-to-1 mapping of column name to named parameter.
 * It escapes the chars shown in
 * <https://stackoverflow.com/a/51574648/10149169> using &hex style encoding.
 *
 * @function
 * @alias module:sqlite-schema-converter.makeNamedParameter
 * @param {string} namedParameter The parameter to escape and make.
 * @returns {string} The escaped named parameter.
 * @example
 *   // returns ":a((/;😀%20%29)"
 *   makeNamedParameter("(/;😀 )");
 */
module.exports.makeNamedParameter = function(namedParameter) {
  // invalid SQLite parameter names are whitespace chars
  // so we escape them with %signs and escape % signs as well
  const escapeParameter = namedParameter.replace(
    // these are the only invalid characters for parameters
    // ie ASCII whitespace, and the ) bracket. % is used as an escape char.
    // eslint-disable-next-line no-control-regex
    /[%\x09\x0a\x0c\x0d\x20)]/g, escapeURIchar);
  return `:a(${escapeParameter})`;
};

/**
 * Convert row of TDX values to SQLite values.
 * @function
 * @alias module:sqlite-schema-converter.convertRowToSqlite
 * @param {Object<string, string>} schema - Object of columns -> SQLite types
 * @param {Object<string, any>} row - Object of a data row of column -> value
 * @returns {Object<string, number|string>} - The converted values.
 */
module.exports.convertRowToSqlite = function(schema, row) {
  const converted = {};
  for (const column in row) {
    const data = row[column];
    converted[column] = module.exports.convertToSqlite(schema[column], data, {
      onlyStringify: true, // don't need because we are binding values
    });
  }
  return converted;
};

/**
 * Converts a tdx value to a sqlite value based on a sqlite type.
 * @function
 * @alias module:sqlite-schema-converter.convertToSqlite
 * @param {string} type - Sqlite type to convert the value to
 * @param {string} value - TDX value to convert from
 * @param {object} options - optional addition options
 * @param  {boolean} [options.onlyStringify] - set to `true` to turn off
 *     escaping single-quotes and delimiter addition.
 *     This shouldn't be required as one should bind strings to SQLite
 *     statements to avoid SQL injections anyway.
 * @returns {number|string} - The converted value.
 *     If it is an unrecognized type it will return `null`.
 */
module.exports.convertToSqlite = function(type, value, options) {
  let result;

  options = options || {};

  const onlyStringify = options.onlyStringify || false;

  switch (type) {
    case sqliteConstants.SQLITE_GENERAL_TYPE_NDARRAY:
    case sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT:
    case sqliteConstants.SQLITE_GENERAL_TYPE_ARRAY:
      result = (onlyStringify) ? JSON.stringify(value) : `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      break;
    case sqliteConstants.SQLITE_TYPE_NUMERIC:
    case sqliteConstants.SQLITE_TYPE_INTEGER:
    case sqliteConstants.SQLITE_TYPE_REAL:
      result = value;
      break;
    case sqliteConstants.SQLITE_TYPE_TEXT:
      result = (onlyStringify) ? value : `'${value.replace(/'/g, "''")}'`;
      break;
    default:
      result = null;
  }
  return result;
};

/**
 * Converts a sqlite value to a tdx value based on a sqlite type.
 * @function
 * @alias module:sqlite-schema-converter.convertToTdx
 * @param {string} type - Sqlite type to convert the value to
 * @param {string} value - SQlite value to convert from
 * @returns {number|string|array|object} - The converted value.
 *     If it is an unrecognized type it will return `null`.
 */
module.exports.convertToTdx = function(type, value) {
  let result;

  switch (type) {
    case sqliteConstants.SQLITE_GENERAL_TYPE_NDARRAY:
    case sqliteConstants.SQLITE_GENERAL_TYPE_OBJECT:
    case sqliteConstants.SQLITE_GENERAL_TYPE_ARRAY:
      result = JSON.parse(value);
      break;
    case sqliteConstants.SQLITE_TYPE_NUMERIC:
    case sqliteConstants.SQLITE_TYPE_INTEGER:
    case sqliteConstants.SQLITE_TYPE_REAL:
      result = value;
      break;
    case sqliteConstants.SQLITE_TYPE_TEXT:
      result = value;
      break;
    default:
      result = null;
  }
  return result;
};
