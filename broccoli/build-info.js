'use strict';
const fs = require('fs');
const path = require('path');
const gitRepoInfo = require('git-repo-info');
const semver = require('semver');

const NON_SEMVER_IDENTIFIER = /[^0-9A-Za-z-]/g;

/** @type {BuildInfo} */
let cached;

/**
 * @param {Options=} options
 * @returns {BuildInfo}
 */
function buildInfo(options) {
  if (!options && cached) {
    return cached;
  }
  let root = (options && options.root) || path.resolve(__dirname, '..');
  let packageVersion = (options && options.packageVersion) || readPackageVersion(root);
  let gitInfo = (options && options.gitInfo) || buildGitInfo(root);
  let buildInfo = buildFromParts(packageVersion, gitInfo);
  if (!options) {
    cached = buildInfo;
  }
  return buildInfo;
}

/**
 * @param {string} root
 * @returns {GitInfo}
 */
function buildGitInfo(root) {
  let info = gitRepoInfo(root);
  return {
    sha: info.sha,
    branch: info.branch,
    tag: info.tag,
  };
}

/**
 * @typedef {Object} GitInfo
 * @property {string} sha
 * @property {string=} branch
 * @property {string=} tag
 */

/**
 * @typedef {Object} Options
 * @property {string=} root
 * @property {string=} packageVersion
 * @property {GitInfo=} gitInfo
 */

/**
 * @typedef {Object} BuildInfo
 * @property {string=} tag
 * @property {string=} branch
 * @property {string} sha
 * @property {string} shortSha
 * @property {string=} channel
 * @property {string} packageVersion
 * @property {string=} tagVersion
 * @property {string} version
 */

/**
 * Build info object from parts.
 * @param {string} packageVersion
 * @param {GitInfo} gitInfo
 * @returns {BuildInfo}
 */
function buildFromParts(packageVersion, gitInfo) {
  let { tag, branch, sha } = gitInfo;
  let shortSha = sha.slice(0, 8);
  if (tag) {
    let tagVersion = parseTagVersion(tag);
    return {
      tag,
      branch: null,
      sha,
      shortSha,
      channel: 'tag',
      packageVersion,
      tagVersion,
      version: tagVersion,
      isBuildForTag: true,
    };
  } else {
    let channel =
      branch === 'main'
        ? process.env.BUILD_TYPE === 'alpha'
          ? 'alpha'
          : 'canary'
        : branch && escapeSemVerIdentifier(branch);
    let version = buildVersion(packageVersion, shortSha, channel);
    return {
      tag: null,
      branch,
      sha,
      shortSha,
      channel,
      packageVersion,
      tagVersion: null,
      version,
      isBuildForTag: false,
    };
  }
}

/**
 * Read package version.
 * @param {string} root
 * @returns {string}
 */
function readPackageVersion(root) {
  let pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  // use _originalVersion if present if we've already mutated it
  return pkg._originalVersion || pkg.version;
}

/**
 * @param {string} tag
 */
function parseTagVersion(tag) {
  return tag && semver.parse(tag).version;
}

/**
 * @param {string} txt
 */
function escapeSemVerIdentifier(txt) {
  return txt.replace(NON_SEMVER_IDENTIFIER, '-');
}

/**
 * @param {string} packageVersion
 * @param {string} sha
 * @param {string=} channel
 */
function buildVersion(packageVersion, sha, channel) {
  let base = semver.parse(packageVersion);
  let major = base.major;
  let minor = base.minor;
  let patch = base.patch;
  let suffix = '';
  suffix += toSuffix('-', base.prerelease, channel);
  suffix += toSuffix('+', base.build, sha);
  return `${major}.${minor}.${patch}${suffix}`;
}

/**
 * @param {string} delim
 * @param {string[]} identifiers
 * @param {string=} identifier
 */
function toSuffix(delim, identifiers, identifier) {
  if (identifier) {
    identifiers = identifiers.concat([identifier]);
  }
  if (identifiers.length > 0) {
    return delim + identifiers.join('.');
  }
  return '';
}

module.exports.buildInfo = buildInfo;
module.exports.buildFromParts = buildFromParts;
module.exports.buildVersion = buildVersion;
module.exports.parseTagVersion = parseTagVersion;
