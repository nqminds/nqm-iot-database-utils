/**
 * Module to define library constants.
 *
 * ![nqminds-blue-logo.png][1] ![interlinq-logo-darker.png][2]
 *
 * [1]: ./img/nqminds-blue-logo.png
 * [2]: ./img/interlinq-logo-darker.png
 *
 * @module sqlite-constants
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

exports.DATABASE_MEMORY_MODE = ":memory:";
exports.DATABASE_FILE_TYPE = "file";
exports.DATABASE_MEMORY_TYPE = "memory";
exports.DATABASE_INFO_TABLE_NAME = "info";
exports.DATABASE_DATA_TABLE_NAME = "data";
exports.DATABASE_TABLE_INDEX_NAME = "dataindex";
exports.DATABASE_FOLDER_SUFFIX = ".d";
exports.DATABASE_DATA_SUFFIX = ".dat";
exports.DATABASE_DATA_TMP_NAME = "nqm-iot-database-utils";

// Binary data types
exports.DATABASE_PATH_TYPE_FILE = "f";

// Valid TDX schema types
exports.TDX_TYPE_NAME = "__tdxType";
exports.TDX_TYPE_NUMBER = "number";
exports.TDX_TYPE_STRING = "string";
exports.TDX_TYPE_BOOLEAN = "boolean";
exports.TDX_TYPE_INT = "INT";
exports.TDX_TYPE_REAL = "/*REAL|FLOA|DOUB";
exports.TDX_TYPE_DATE = "date";
exports.TDX_TYPE_NDARRAY = "ndarray";

// Valid sqlite schema types
exports.SQLITE_TYPE_NUMERIC = "NUMERIC";
exports.SQLITE_TYPE_INTEGER = "INTEGER";
exports.SQLITE_TYPE_REAL = "REAL";
exports.SQLITE_TYPE_TEXT = "TEXT";

// General sqlite schema types added for conversion purposes
exports.SQLITE_GENERAL_TYPE_OBJECT = "OBJECT";
exports.SQLITE_GENERAL_TYPE_ARRAY = "ARRAY";
exports.SQLITE_GENERAL_TYPE_NDARRAY = "NDARRAY";

exports.SQLITE_SORT_TYPE_ASC = "ASC";
exports.SQLITE_SORT_TYPE_DESC = "DESC";

exports.SQLITE_NULL_VALUE = "null";

// SQlite query parameters
exports.SQLITE_QUERY_LIMIT = 1000;

// Maximum number of recursion for directory creation
exports.MAX_PATH_RECURSIONS = 100;


/**
 * @global
 * @constant
 * @type {object}
 * @name {NDARRAY_DTYPES}
 */
exports.NDARRAY_DTYPES = {
  "uint8": "uint8",
  "uint16": "uint16",
  "uint32": "uint32",
  "int8": "int8",
  "int16": "int16",
  "int32": "int32",
  "float": "float",
  "float32": "float32",
  "double": "double",
  "float64": "float64",
  "stream": "stream",
  "buffer": "buffer",
};


/**
 * @global
 * @constant
 * @type {object}
 * @name {NDARRAY_FTYPES}
 */
exports.NDARRAY_FTYPES = {
  "raw": "raw",
  "b64": "b64",
  "zip": "zip",
};

/**
 * For use in {@link module:sqlite-manager.getResource}.
 *
 * Maps the keyname stored in the info table with the key expected in the API's
 * {@link Resource} type.
 */
exports.INFO_TABLE_KEYS_TO_TDX_RESOURCE_KEYS = {
  description: "description",
  id: "id",
  name: "name",
  parents: "parents",
  tags: "tags",
  schema: "schemaDefinition",
};
