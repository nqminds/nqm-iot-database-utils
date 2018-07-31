/**
 * Module to insert data into a db.
 * @module sqlite-helper
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */

const sqliteConstants = require("./sqlite-constants.js");
const util = require("util");

module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");

  const helper = {};

  /**
   * @global
   * @typedef {function} SQLiteStatementCreator
   * @param {array<string>} dataRowKeys - List of columns in the data.
   *     This must be in the same order as the data will be binded.
   * @returns An SQLite Statement with binding parameters.
   */

  /**
   * Runs an SQLite statement for each row in data.
   *
   * It caches statements depending on the columns in each row of data.
   * @function
   * @alias module:sqlite-helper.executeMany
   * @async
   * @param {object} db - The sqlite3 db object from module node-sqlite3.
   * @param {SQLiteStatementCreator} sqliteStatementCreator - A function that
   *     creates SQLite strings.
   * @param {array<object>} data - A list of all the data rows to execute.
   * @returns {Promise<null>}
   */
  helper.executeMany = function(db, sqliteStatementCreator, data) {
    return new Promise((resolve, reject) => {
      /*
       * db.serialize means everything in the function is done in serial, not in
       * parallel as is normal,
       * ie after all the db.whatever functions are called, all the callbacks
       * are executed one after another.
       */
      db.serialize(() => {
        /*
         * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!WARNING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
         * ! Do not use await/Promises between a BEGIN/COMMIT TRANSACTION      !
         * ! You will cause race conditions when other Promises run at the     !
         * ! same time (unless you make a separate db connection, but that     !
         * !            breaks tests since you can't have a second db          !
         * !            connection to an in-memory db)                         !
         * ! Trust me, this caused me so much pain...                          !
         * !!!!!!!!!!!!!!!!!!!!!!!!!!!!WARNING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
         */

        // cache all the statements. This is so we can reuse them for speed.
        const cachedStatements = new Map();

        // begin an sqlite transaction. We don't write to disk until we see a
        // "COMMIT TRANSACTION" command. This super speeds up everything.
        db.run("BEGIN IMMEDIATE TRANSACTION;");
        for (const dataRow of data) {
          // ES6 has a defined constant order for Object.keys and Object.values
          // so we can count on them always having the same order
          const dataRowKeys = Object.keys(dataRow);

          // first, check cache to see if statement already exists
          let statement = cachedStatements.get(dataRowKeys.join());
          // only create the statement if it doesn't exist
          if (statement === undefined) {
            statement = db.prepare(
              sqliteStatementCreator(dataRowKeys), [], (error) => {
                if (error) {
                  reject(Error(error));
                }
              });
            cachedStatements.set(dataRowKeys.join(), statement);
          }
          statement.run(Object.values(dataRow), (error) => {
            if (error) {
              reject(Error(error));
            }
          });
        }
        db.run("COMMIT TRANSACTION;");
        // make promisified finalize function.
        // this is so we can run Promise.all() and wait for all the promises to
        // finalize
        const promisifiedFinalize = util.promisify((statement, cb) => {
          statement.finalize(cb);
        });
        // making array of promises
        const promisedFinalizes = [];
        for (const preparedStatement of cachedStatements.values()) {
          promisedFinalizes.push(promisifiedFinalize(preparedStatement));
        }
        Promise.all(promisedFinalizes).then((result) => {
          // we resolve this massive promise when they all succeed
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      });
    });
  };
  return helper;
}());
