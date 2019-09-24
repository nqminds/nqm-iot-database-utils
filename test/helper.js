const fs = require("fs");

/**
 * Adapted from
 * https://github.com/nodejs/node/blob/master/lib/internal/process/warning.js
 */
exports.onWarning = (warning) => {
  if (!(warning instanceof Error)) return;
  const isDeprecation = warning.name === 'DeprecationWarning';
  if (isDeprecation) return;
  const trace = (isDeprecation && process.traceDeprecation);
  let msg = `(${process.release.name}:${process.pid}) `;
  if (warning.code)
    msg += `[${warning.code}] `;
  if (trace && warning.stack) {
    msg += `${warning.stack}`;
  } else {
    const toString =
      typeof warning.toString === 'function' ?
        warning.toString : Error.prototype.toString;
    msg += `${toString.apply(warning)}`;
  }
  if (typeof warning.detail === 'string') {
    msg += `\n${warning.detail}`;
  }
  console.warn(msg);
};
process.on("warning", exports.onWarning); // print warnings to console

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
