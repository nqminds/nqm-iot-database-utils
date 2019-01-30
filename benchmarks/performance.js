"use strict";

const shortid = require("shortid");
const del = require("del");
const sqliteUtils = require("../index.js");
const helper = require("../test/helper.js");
const nd = require("ndarray");
const Profiler = require("../utils/profiler");
const cTable = require("console.table");

const profiler = new Profiler();

const datasetSchema = {
  "schema": {
    "dataSchema": {
      "timestamp": {
        "__tdxType": ["number"],
      },
      "arrayData": {
        "__tdxType": ["ndarray"],
      },
    },
    "uniqueIndex": [],
  },
};

const arrayShapes = [
  [8, 8],
  [64, 64],
  [128, 128],
  [256, 256],
  [512, 512],
  [1024, 1024],
  [4096, 4096],
  [4096 * 2, 4096 * 2],
];

const TOTAL_ITERATIONS = 5;
const main = async function () {
  const statTable = [];
  let timestamp = 0;
  const dbFileName = shortid.generate() + ".sqlite";
  const db = await sqliteUtils.openDatabase(dbFileName, "file", "w+");
  const datasetId = await sqliteUtils.createDataset(db, datasetSchema);
  console.log(`Created dataset [${datasetId}]`);

  console.log("1 per insert:");
  for (let idx = 0; idx < arrayShapes.length; idx++) {
    const arrayShape = arrayShapes[idx];
    const arraySize = arrayShapes[idx].reduce((a, b) => (a * b));
    let duration = 0;
    console.log(`Adding array shape [${arrayShapes[idx]}] and size ${arraySize} (bytes)`);
    for (let iters = 0; iters < TOTAL_ITERATIONS; iters++) {
      const array = nd(new Uint8Array(arraySize), arrayShape);

      profiler.start();
      await sqliteUtils.addData(db, {"timestamp": timestamp, "arrayData": array});
      profiler.stop();

      // Get the number of ms
      duration += profiler.getDuration();
      timestamp++;
    }

    // Get the number of seconds
    duration /= TOTAL_ITERATIONS * 1000;

    // Estimate speed in bits per second
    const dataSpeed = ((arraySize * 8) / duration) / 1024;
    statTable.push({
      "rows": 1,
      "shape": `[${arrayShapes[idx][0]},${arrayShapes[idx][1]}]`,
      "bytes": arraySize,
      "duration": duration,
      "speed (Kbs)": dataSpeed.toFixed(2),
      "speed (Mbs)": (dataSpeed / 1024).toFixed(2),
    });
  }
  
  console.log("1000 per insert:");
  for (let idx = 0; idx < arrayShapes.length; idx++) {
    const arrayShape = arrayShapes[idx];
    const arraySize = arrayShapes[idx].reduce((a, b) => (a * b));
    let duration = 0;
    console.log(`Adding array shape [${arrayShapes[idx]}] and size ${arraySize} (bytes)`);
    const sqliteData = [];
    for (let rows = 0; rows < 1000; rows++) {
      const array = nd(new Uint8Array(arraySize), arrayShape);
      sqliteData.push({
        "timestamp": timestamp,
        "arrayData": array,
      });

      timestamp++;
    }

    profiler.start();
    await sqliteUtils.addData(db, sqliteData);
    profiler.stop();

    // Get the number of ms
    duration = profiler.getDuration();

    // Get the number of seconds
    duration /= 1000;

    // Estimate speed in bits per second
    const dataSpeed = ((arraySize * 8) / duration) / 1024;
    statTable.push({
      "rows": 1000,
      "shape": `[${arrayShapes[idx][0]},${arrayShapes[idx][1]}]`,
      "bytes": arraySize,
      "duration": duration,
      "speed (Kbs)": dataSpeed.toFixed(2),
      "speed (Mbs)": (dataSpeed / 1024).toFixed(2),
    });
  }

  const plotTable = cTable.getTable(statTable);
  console.log("[Data Table]");
  console.log(plotTable);

  console.log("Deleting database...");
  del.sync(db.dataFolder);
  helper.deleteFile(dbFileName);
  console.log("Done!");
};

main();
