"use strict";

const debug = require("debug")("reader");
const Profiler = require("../utils/profiler");
const sqlite3 = require("sqlite3").verbose();

const profiler = new Profiler();
const db = new sqlite3.Database(process.argv[2], sqlite3.OPEN_READWRITE, (err) => {
  if (err) debug(err.message);
});

setTimeout(dbWriteTimeout, 100, db);

function dbWriteTimeout(db) {
  profiler.start();

  db.get("SELECT * FROM lorem ORDER BY rowid DESC LIMIT 1;", [], (err, row) => {
    if (err) {
      debug(err.message);
      db.close();
    } else {
      profiler.stop();

      debug(`Value: ${row.info} with time ${profiler.getDuration()} and min/max ${profiler.getMinMax()[0]},${profiler.getMinMax()[1]}`);
      setTimeout(dbWriteTimeout, 100, db);
    }
  });
}
