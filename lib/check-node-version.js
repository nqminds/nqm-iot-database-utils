"use strict";

const semver = require("semver");

/**
 * Checks that the current node version matches the requirements.
 *
 * @returns {boolean|null}
 *   - `true` if the current version meets the requirements.
 *   - `null` if the script was not run with `npm`.
 * @throws {Error} - If the current Node.js version does not meet
 *   the requirements listed in the package.json file.
 */
module.exports = function() {
  const nodeVersionRequirement = require("../package.json").engines.node;
  if (nodeVersionRequirement === undefined) {
    return null;
  }
  const validEngine = semver.satisfies(
    process.versions.node, nodeVersionRequirement);
  if (validEngine) {
    return true;
  }
  throw Error(`Current version of Node.js ${process.versions.node} does not ` +
    `satisfy 'engines.node' in package.json of ${nodeVersionRequirement}`);
};
