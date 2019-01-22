/**
 * Module to manage the ndarray entries for sqlite.
 *
 * ![nqminds-blue-logo.png][1] ![interlinq-logo-darker.png][2]
 *
 * [1]: ./img/nqminds-blue-logo.png
 * [2]: ./img/interlinq-logo-darker.png
 *
 * @module sqlite-ndarray
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

module.exports = (function() {
  "use strict";

  const _ = require("lodash");
  const nd = require("ndarray");
  const sqliteConstants = require("./sqlite-constants.js");

  const ndamodule = {};

  /**
   * Returns the major type given a stride order.
   * @param {number[]} order The stride order array.
   * @returns {boolean} true - (C - order), false - (F - order).
   */
  function strideOrderToMajor(order) {
    const dimensions = order.length;
    if (!dimensions)
      return true;

    return (order[0] === dimensions - 1);
  }

  /**
   * Returns the metadata from am ndarray instance
   * @function
   * @alias module:sqlite-ndarray.getNdarrayMeta
   * @sync
   * @param {object} array - The ndarray input object
   * @returns {object} - The ndarray metadata
   */
  ndamodule.getNdarrayMeta = function(array) {
    // Default platform alignment byte order
    // ">" (big-endian), "<" (little-endian), "=" (hardware-native)
    let dtype = "=";
    switch (array.dtype) {
      case "uint8":
        dtype += "B";
        break;
      case "uint16":
        dtype += "H";
        break;
      case "uint32":
        dtype += "u32";
        break;
      case "int8":
        dtype += "b";
        break;
      case "int16":
        dtype += "h";
        break;
      case "int32":
        dtype += "i4";
        break;
      case "float":
      case "float32":
        dtype += "f4";
        break;
      case "double":
      case "float64":
        dtype += "f8";
        break;
      case "uint8_clamped":
      case "buffer":
      case "data":
      case "dataview":
        dtype += "B";
        break;

      default:
        dtype += "";
    }

    // Retrieve the timestamp buffer in milliseoncds
    const timestampArray = new Date().getTime().toString().split("").map((value) => (parseInt(value)));

    // Make the filename (check the Python construct)
    const fileName = Buffer.from(timestampArray).toString("base64") + sqliteConstants.DATABASE_DATA_SUFFIX;

    return {
      "t": dtype,
      "s": array.shape,
      "v": "f",
      "c": strideOrderToMajor(array.order),
      "p": fileName,
    };
  };

  /**
   * Write ndarray documents to files.
   * @function
   * @alias module:sqlite-ndarray.writeNdarrayMany
   * @sync
   * @param {object} db - The sqlite3 db object from module node-sqlite3.
   * @param {array<object>} data - A list of all the data rows to write to file.
   * @param {string} key - The key representing the ndarray.
   * @returns {array<object>} - The modified data list with ndarray metadata
   */
  ndamodule.writeNdarrayMany = function(db, data, key) {
    const retData = [];

    for (const dataRow of data) {
      const meta = ndamodule.getNdarrayMeta(dataRow[key]);
      const newRow = _.omit(dataRow, key);
      newRow[key] = meta;
      retData.push(newRow);
      // Save data to file
    }

    return retData;
  };

  return ndamodule;
}());
