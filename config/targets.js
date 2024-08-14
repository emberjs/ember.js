'use strict';
const { allSupportedBrowsers, modernBrowsers } = require('./browserlists');

const isProduction = process.env.EMBER_ENV === 'production';
const browsers =
  isProduction || Boolean(process.env.ALL_SUPPORTED_BROWSERS)
    ? allSupportedBrowsers
    : modernBrowsers;

module.exports = {
  browsers,
  ...(process.env.SHOULD_TRANSPILE_FOR_NODE ? { node: 'current' } : undefined),
};
