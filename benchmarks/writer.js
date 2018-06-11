"use strict";

const debug = require("debug")("writer");
const Profiler = require("../utils/profiler");
const shortid = require("shortid");
const sqlite3 = require("sqlite3").verbose();

const profiler = new Profiler();
const db = new sqlite3.Database(process.argv[2], sqlite3.OPEN_READWRITE, (err) => {
  if (err) debug(err.message);
});

db.exec("PRAGMA journal_mode=WAL;", (err) => {
  if (err) debug(err.message);
  else setTimeout(dbWriteTimeout, 10, db);
});

function dbWriteTimeout(db) {
  const id = shortid.generate();

  profiler.start();

  db.run("INSERT INTO lorem VALUES (?)", id, (err) => {
    if (err) {
      debug(err.message);
      db.close();
    } else {
      profiler.stop();

      debug(`Added: ${id} with time ${profiler.getDuration()} and min/max ${profiler.getMinMax()[0]},${profiler.getMinMax()[1]}`);
      setTimeout(dbWriteTimeout, 100, db);
    }
  });
}
