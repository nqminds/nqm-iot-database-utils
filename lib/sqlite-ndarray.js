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
  const fs = require("fs");
  const os = require("os");
  const nd = require("ndarray");
  const path = require("path");
  const shortid = require("shortid");
  const toBuffer = require("typedarray-to-buffer");
  const sqliteConstants = require("./sqlite-constants.js");

  const ndamodule = {};

  /**
   * Returns the major type given a stride order.
   * @param {number[]} order - The stride order array.
   * @returns {boolean} true - (C - order), false - (F - order).
   */
  function strideOrderToMajor(order) {
    const dimensions = order.length;
    if (!dimensions)
      return true;

    return (order[0] === dimensions - 1);
  }
  /**
   * Returns the stride for a give major.
   * @param {boolean} major - true - (C - order), false - (F - order).
   * @param {array} size - The size of the matrix.
   * @returns {array} The stride value.
   */
  function majorToStride(major, size) {
    const stride = [];

    if (major) {
      for (let i = size.length - 1; i >= 1; i--) {
        let mult = 1;
        for (let j = 1; j <= i; j++)
          mult *= size[j];
        stride.push(mult);
      }

      stride.push(1);
    } else {
      stride.push(1);

      for (let i = 0; i <= size.length - 2; i++) {
        let mult = 1;
        for (let j = 0; j <= i; j++)
          mult *= size[j];
        stride.push(mult);
      }
    }

    return stride;
  }

  /**
   * Returns the numpy endianness of the system.
   * @returns {string} < - little endian, > - bing endian.
   */
  function getEndianness() {
    return (os.endianness() === "BE") ? ">" : "<";
  }

  /**
   * Returns the buffer size in bytes from a numpy type
   * @function
   * @alias module:sqlite-ndarray.getTypedBufferSize
   * @sync
   * @param {string} numpyType - The numpy array type
   * @param {array} numpySize - The numpy array size
   * @returns {number} - The buffer size
   */
  ndamodule.getTypedBufferSize = function(numpyType, numpySize) {
    const size = numpySize.reduce((a, b) => (a * b));
    const arrayType = numpyType.slice(1);

    switch (arrayType) {
      case "B":
        return size;
      case "H":
        return 2 * size;
      case "u32":
        return 4 * size;
      case "b":
        return size;
      case "h":
        return 2 * size;
      case "i4":
        return 4 * size;
      case "f4":
        return 4 * size;
      case "f8":
        return 8 * size;
    }

    return size;
  };

  /**
   * Returns the Javascript typed array from a numpy type and a buffer
   * @function
   * @alias module:sqlite-ndarray.getTypedArrayFromBuffer
   * @sync
   * @param {Buffer} byteBuffer - The byte buffer object
   * @param {string} numpyType - The numpy array type
   * @returns {<Buffer>|<TypedArray>|<DataView>} - The buffer object
   */
  ndamodule.getTypedArrayFromBuffer = function(byteBuffer, numpyType) {
    const arrayType = numpyType.slice(1);

    switch (arrayType) {
      case "B":
        return new Uint8Array(byteBuffer.buffer);
      case "H":
        return new Uint16Array(byteBuffer.buffer);
      case "u32":
        return new Uint32Array(byteBuffer.buffer);
      case "b":
        return new Int8Array(byteBuffer.buffer);
      case "h":
        return new Int16Array(byteBuffer.buffer);
      case "i4":
        return new Int32Array(byteBuffer.buffer);
      case "f4":
        return new Float32Array(byteBuffer.buffer);
      case "f8":
        return new Float64Array(byteBuffer.buffer);
    }

    return buffer;
  };

  /**
   * Returns the Javascript buffer from a numpy type
   * @function
   * @alias module:sqlite-ndarray.getTypedArray
   * @sync
   * @param {string} numpyType - The numpy array type
   * @param {array} numpySize - The numpy array size
   * @returns {<Buffer>|<TypedArray>|<DataView>} - The buffer object
   */
  ndamodule.getTypedArray = function(numpyType, numpySize) {
    const size = numpySize.reduce((a, b) => (a * b));
    const arrayType = numpyType.slice(1);

    switch (arrayType) {
      case "B":
        return new Uint8Array(size);
      case "H":
        return new Uint16Array(size);
      case "u32":
        return new Uint32Array(size);
      case "b":
        return new Int8Array(size);
      case "h":
        return new Int16Array(size);
      case "i4":
        return new Int32Array(size);
      case "f4":
        return new Float32Array(size);
      case "f8":
        return new Float64Array(size);
    }

    return new Buffer(size);
  };

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
    let dtype = getEndianness();

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
    const fileName = Buffer.from(timestampArray).toString("base64") + shortid.generate() + sqliteConstants.DATABASE_DATA_SUFFIX;

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
   * @async
   * @param {object} db - The sqlite3 db object from module node-sqlite3.
   * @param {array<object>} data - A list of all the data rows to write to file.
   * @param {string|string[]} key - The key(s) representing the ndarray(s).
   * @returns {Promise<array<object>>} - The modified data list with ndarray metadata
   */
  ndamodule.writeNdarrayMany = function(db, data, key) {
    return new Promise((resolve, reject) => {
      const retData = [];
      const dataKeys = [].concat(key);

      // Iterate over documents
      for (const dataRow of data) {
        const newRow = _.omit(dataRow, dataKeys);

        // Iterate over ndarray keys
        for (const keyValue of dataKeys) {
          const meta = ndamodule.getNdarrayMeta(dataRow[keyValue]);
          newRow[keyValue] = meta;

          // Save data to file
          const filePath = path.join(db.dataFolder, meta.p);
          try {
            const fd = fs.openSync(filePath, "wx");
            const typedBuffer = dataRow[keyValue].data;
            const bufSize = typedBuffer.buffer.byteLength;
            const bytesWritten = fs.writeSync(fd, toBuffer(typedBuffer), 0, bufSize);
            fs.closeSync(fd);

            // Check if what's written is consistent with metadata
            if (bytesWritten !== bufSize)
              reject(Error(`Metadata size different to file size for ${JSON.stringify(meta)} while write`));
          } catch (error) {
            reject(error);
          }
        }
        // Save to the new list
        retData.push(newRow);
      }

      resolve(retData);
    });
  };

  /**
   * Read ndarray documents from files.
   * @function
   * @alias module:sqlite-ndarray.readNdarrayMany
   * @async
   * @param {object} db - The sqlite3 db object from module node-sqlite3.
   * @param {array<object>} data - A list of all the data rows to read from files.
   * @param {string|string[]} key - The key(s) representing the ndarray(s).
   * @returns {Promise<array<object>>} - The modified data list with ndarray objects
   */
  ndamodule.readNdarrayMany = function(db, data, key) {
    return new Promise((resolve, reject) => {
      const retData = [];
      const dataKeys = [].concat(key);
      const alignment = getEndianness();
      
      // Iterate over documents
      for (const dataRow of data) {
        const newRow = _.omit(dataRow, dataKeys);
      
        // Iterate over ndarray keys
        for (const keyValue of dataKeys) {
          const meta = dataRow[keyValue] || {};
          
          // Stop the loop if the entry is not defined 
          if (_.isEmpty(meta)) break;

          // If not defined assume it is a buffer with native alignment
          meta["t"] = meta["t"] || `${alignment  }B`;
          if (meta["t"][0] !== alignment)
            throw Error("Non native byte alignment!");
        
          meta["s"] = meta["s"] || [0];

          // Prepare the file buffers
          const bufferSize = ndamodule.getTypedBufferSize(meta["t"], meta["s"]);
          const fileBuffer = Buffer.alloc(bufferSize);

          if (meta["v"] !== sqliteConstants.DATABASE_PATH_TYPE_FILE)
            reject(Error("Non file paths are not supported yet!"));
        
          try {
            let filePath = "";
          
            // Check if the path is absolute, otherwise append the db path
            if (path.isAbsolute(meta["p"]))
              filePath = meta["p"];
            else filePath = path.join(db.dataFolder, meta["p"]);
          
            // Check the size of the file
            const dataFileStats = fs.statSync(filePath);
          
            // Open the file for reading only, throw an error if it doesn't exist
            const fd = fs.openSync(filePath, "r");
            const bytesRead = fs.readSync(fd, fileBuffer, 0, fileBuffer.length, 0);
            fs.closeSync(fd);
          
            // Check if what's read is consistent with metadata
            if (bytesRead !== dataFileStats.size)
              reject(Error(`Metadata size different to file size for ${JSON.stringify(meta)} while read`));
          } catch (error) {
            reject(error);
          }

          // Assign the new ndarray object
          const typedBuffer = ndamodule.getTypedArrayFromBuffer(fileBuffer, meta["t"]);
          newRow[keyValue] = nd(typedBuffer, meta["s"], majorToStride(meta["c"], meta["s"]));
        }

        // Save to the new list
        retData.push(newRow);
      }

      resolve(retData);
    });
  };

  return ndamodule;
}());
