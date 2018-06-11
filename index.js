"use strict";

const shortid = require("shortid");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(process.argv[2], sqlite3.OPEN_READWRITE, (err) => {
  if (err) console.log(err.message);
});

// db.serialize(function() {
//   const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
//   for (let i = 0; i < 10; i++) {
//     stmt.run(shortid.generate());
//   }
//   stmt.finalize();

//   db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
//     console.log(`${row.id}: ${row.info}`);
//   });
// });

// db.close();