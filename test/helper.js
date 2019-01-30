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

exports.readFile = function(name, buffer, length) {
  try {
    const fd = fs.openSync(name, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return bytesRead;
  } catch (error) {
    throw error;
  }
};
