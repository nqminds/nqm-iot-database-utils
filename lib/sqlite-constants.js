exports.DATABASE_MEMORY_MODE = ":memory:";
exports.DATABASE_FILE_TYPE = "file";
exports.DATABASE_MEMORY_TYPE = "memory";
exports.DATABASE_INFO_TABLE_NAME = "info";
exports.DATABASE_DATA_TABLE_NAME = "data";
exports.DATABASE_TABLE_INDEX_NAME = "dataindex";

// Valid TDX schema types
exports.TDX_TYPE_NAME = "__tdxType";
exports.TDX_TYPE_NUMBER = "number";
exports.TDX_TYPE_STRING = "string";
exports.TDX_TYPE_BOOLEAN = "boolean";
exports.TDX_TYPE_INT = "INT";
exports.TDX_TYPE_REAL = "/*REAL|FLOA|DOUB";
exports.TDX_TYPE_DATE = "date";

// Valid sqlite schema types
exports.SQLITE_TYPE_NUMERIC = "NUMERIC";
exports.SQLITE_TYPE_INTEGER = "INTEGER";
exports.SQLITE_TYPE_REAL = "REAL";
exports.SQLITE_TYPE_TEXT = "TEXT";

// General sqlite schema types added for conversion purposes
exports.SQLITE_GENERAL_TYPE_OBJECT = "OBJECT";
exports.SQLITE_GENERAL_TYPE_ARRAY = "ARRAY";

exports.SQLITE_SORT_TYPE_ASC = "ASC";
exports.SQLITE_SORT_TYPE_DESC = "DESC";

exports.SQLITE_NULL_VALUE = "null";

// SQlite query parameters
exports.SQLITE_QUERY_LIMIT = 1000;
