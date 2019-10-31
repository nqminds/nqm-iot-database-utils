"use strict";

const semver = require("semver");

/**
 * Checks that the current node version matches the requirements.
 *
 * @throws {Error} - If the current Node.js version does not meet
 *   the requirements listed in the package.json file.
 */
module.exports = function() {
  const nodeVersionRequirement = require("../package.json").engines.node;
  const validEngine = semver.satisfies(
    process.versions.node, nodeVersionRequirement);
  if (validEngine) {
    return;
  }
  throw Error(`Current version of Node.js ${process.versions.node} does not ` +
    `satisfy 'engines.node' in package.json of ${nodeVersionRequirement}`);
};
