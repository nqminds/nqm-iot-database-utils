/**
 * Module to insert data into a db.
 * @module sqlite-helper
 * @author Alexandru Mereacre <mereacre@gmail.com>
 */
"use strict";

/**
 * @global
 * @typedef {function} SQLiteStatementCreator
 * @param {Array<string>} dataRowKeys - List of columns in the data.
 *     This must be in the same order as the data that will be bound.
 * @returns {string} An SQLite Statement with binding parameters.
 */

/**
 * Stores SQLite Prepared (compiled) Statements
 */
class PreparedStatementCache {
  constructor() {
    /** @typedef {Map<string, sqlite3.Statement>} */
    this.cache = new Map();
  }

  /**
   * Creates a unique key for the cache from an array of strings.
   * @param {Array<string>} keys An array of strings.
   * @returns {string} A unique string for use as a unique key.
   */
  cacheKey(keys) {
    const escapeCommas = keys.map((key) => key.replace(/,/g, ",,"));
    return escapeCommas.join(",");
  }

  /**
   * Gets the given statement for a list of keys.
   * @param {Array<string>} keys An array of strings.
   * @returns {sqlite3.Statement | undefined}
   *   Returns the cached statement, or `undefined` if none exists.
   */
  get(keys) {
    return this.cache.get(this.cacheKey(keys));
  }

  set(keys, value) {
    this.cache.set(this.cacheKey(keys), value);
    return this;
  }

  /**
   * Cleanup the cached statements.
   */
  async finalizeAll() {
    const promisedFinalizes = Array.from(
      this.cache.values(),
      (cachedStatement) => {
        return finalizeStatement(cachedStatement);
      },
    );
    return Promise.all(promisedFinalizes);
  }
}

/**
 * Finalize and closes a statement, for performance.
 * @param {sqlite3.Statement} statement The statement to finalize
 * @returns {Promise<void>}
 */
function finalizeStatement(statement) {
  return new Promise((resolve, reject) => {
    statement.finalize((error, returnVal) => {
      if (error) {
        reject(Error(error));
      }
      resolve(returnVal);
    });
  });
}

/**
 * Runs an sqlite command on a database and returns a `Promise`.
 * @async
 * @param {sqlite3.Database} db
 * @param {string} sqliteCommand
 * @return {Promise<void>}
 */
function dbRun(db, sqliteCommand) {
  return new Promise((resolve, reject) => {
    db.run(sqliteCommand, (error) => {
      if (error) {
        reject(Error(error));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Runs an sqlite prepared statement with the given params.
 * @async
 * @param {sqlite3.Statement} statement
 * @param {Array<*>} params
 * @return {Promise<void>}
 */
function statementRun(statement, params) {
  return new Promise((resolve, reject) => {
    statement.run(params, (error) => {
      if (error) {
        reject(Error(error));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Runs an SQLite statement for each row in data.
 *
 * This should be run within a sqlite3.Database.serialize context.
 *
 * @param {PreparedStatementCache} statementCache
 *   Should be finalized when finished.
 * @param {sqlite3.Database} db The database to run the commands on.
 * @param {SQLiteStatementCreator} sqliteStatementCreator
 *   A function that creates the SQLite Statement from a list of keys.
 * @param {Array<Object>} data The data to add to the database.
 * @returns {Promise<Array<void>>} A promise that rejects with any errors.
 *
 * @warning This function can never become `async`, as function execution
 *   MUST never be paused between BEGIN TRANSACTION and END TRANSACTION
 */
function runCommands(statementCache, db, sqliteStatementCreator, data) {
  const returnPromises = [];
  try {
    for (const dataRow of data) {
      /*
      * ES6 has a defined constant order for Object.keys and
      * Object.values so we can count on them always having the same
      * order when we run the statement.
      */
      const dataRowKeys = Object.keys(dataRow);

      let compiledStatement = statementCache.get(dataRowKeys);

      if (compiledStatement === undefined) {
        const sqliteStatementString = sqliteStatementCreator(dataRowKeys);
        const compileError = new Promise((resolve, reject) => {
          compiledStatement = db.prepare(
            sqliteStatementString, [], (error) => {
              if (error) {
                reject(Error(error));
              } else {
                resolve();
              }
            },
          );
        });
        returnPromises.push(compileError);

        statementCache.set(dataRowKeys, compiledStatement);
      }
      returnPromises.push(
        statementRun(compiledStatement, Object.values(dataRow)),
      );
    }
  } catch (error) {
    returnPromises.push(Promise.reject(Error(error)));
  }
  return Promise.all(returnPromises);
}

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
 * @param {Array<object>} data - A list of all the data rows to execute.
 * @returns {Promise<void>}
 */
module.exports.executeMany = async function(db, sqliteStatementCreator, data) {
  const cachedStatements = new PreparedStatementCache();
  let beginPromise;
  let endPromise;
  let runCommandPromise;
  /*
   * db.serialize means everything in the function is done in serial, not in
   * parallel as is normal. This function CANNOT BE ASYNC!
   */
  db.serialize(() => {
    beginPromise = dbRun(db, "BEGIN IMMEDIATE TRANSACTION;");
    runCommandPromise = runCommands(
      cachedStatements, db, sqliteStatementCreator, data);
    endPromise = dbRun(db, "COMMIT TRANSACTION;");
  });

  try {
    await Promise.all([beginPromise, runCommandPromise, endPromise]);
  } finally {
    await cachedStatements.finalizeAll();
  }
};
