/**
 * Module to insert data into a db.
 * @module sqlite-helper
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");

  const helper = {};

  /**
   * Execute the sqlite db run command using the prepared statement
   * @function
   * @alias module:sqlite-helper.executeInsert
   * @param {object} db - The sqlite3 db object from module node-sqlite3.
   * @param {string} query - The sqlite query to execute
   * @param {array[]} data - Array of arrays of data
   * @returns {object} - The promise with a count for the total number of documents added or error
   */
  helper.executeInsert = function(db, query, data) {
    return new Promise((resolve, reject) => {
      /*
       * db.serialize means everything in the function is done in serial, not in
       * parallel as is normal,
       * ie after all the db.whatever functions are called, all the callbacks
       * are executed one after another.
       */
      db.serialize(() => {
        const statement = db.prepare(query, [], (error) => {
          if (error) {
            reject(Error(error));
          }
        });

        /*
         * db.serialize only works for statements call within the function, ie
         * none in forEach() callbacks. But since it is all in serial anyway,
         * there is no speed slow down for the a serialized for loop.
         */
        for (const row of data) {
          statement.run(row, (error) => {
            if (error) {
              reject(Error(error));
            }
          });
        }

        /*
         * Calling finalize more than once crashes node.js, do not do this!
         */
        statement.finalize(() => {
          resolve({count: data.length});
        });
      });
    });
  };

  return helper;
}());