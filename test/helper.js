const fs = require("fs");

exports.deleteFile = function(name) {
  try {
    fs.unlinkSync(name);
  } catch (err) {
    if (err.errno !== process.ENOENT && err.code !== "ENOENT" && err.syscall !== "unlink") {
      throw err;
    }
  }
};
