// "use strict";

// const sqliteUtils = require("../index.js");
// const TDX_SCHEMA = {
//   "schema": {
//     "dataSchema": {
//       "prop1": {
//         "__tdxType": ["number"],
//       },
//       "prop2": {
//         "__tdxType": ["number"],
//       },
//     },
//     "uniqueIndex": [{"asc": "prop1"}],
//   },
// };

// let dbIter;
// const testData = [];

// sqliteUtils.openDatabase("", "memory", "w+")
//     .then((db) => {
//       dbIter = db;
//       return sqliteUtils.createDataset(db, TDX_SCHEMA);
//     })
//     .then(() => {
//       return sqliteUtils.createDataset(dbIter, TDX_SCHEMA);
//     })
//     .then(() => {
//       testData.push({prop1: 0, prop2: 99});
//       testData.push({prop1: 0, prop2: 99});
//       return sqliteUtils.addData(dbIter, testData);
//     })
//     .then((result) => {
//       // console.log(result);
//     })
//     .catch((error) => {
      
//     });
  
