'use strict';
const fs = require('fs');
const path = require('path');
const getGitInfo = require('git-repo-info');
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
  let gitInfo = (options && options.gitInfo) || getGitInfo(root);
  let buildInfo = buildFromParts(packageVersion, gitInfo);
  if (!options) {
    cached = buildInfo;
  }
  return buildInfo;
}

module.exports = buildInfo;

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
  let sha = gitInfo.sha;
  let shortSha = sha.slice(0, 8);
  let branch = gitInfo.branch;
  let tag = gitInfo.tag;

  let channel =
    branch === 'master'
      ? process.env.BUILD_TYPE === 'alpha' ? 'alpha' : 'canary'
      : branch && escapeSemVerIdentifier(branch);

  let tagVersion = parseTagVersion(tag);

  let version = tagVersion || buildVersion(packageVersion, channel, shortSha);

  return {
    tag,
    branch,
    sha,
    shortSha,
    channel,
    packageVersion,
    tagVersion,
    version,
  };
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
  try {
    return tag && semver.parse(tag).version;
  } catch (e) {
    return;
  }
}

/**
 * @param {string} txt
 */
function escapeSemVerIdentifier(txt) {
  return txt.replace(NON_SEMVER_IDENTIFIER, '-');
}

/**
 * @param {string} packageVersion
 * @param {string=} channel
 * @param {string} shortSha
 */
function buildVersion(packageVersion, channel, shortSha) {
  let base = semver.parse(packageVersion);
  let major = base.major;
  let minor = base.minor;
  let patch = base.patch;
  let suffix = '';
  suffix += toSuffix('-', base.prerelease, channel);
  suffix += toSuffix('+', base.build, shortSha);
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
