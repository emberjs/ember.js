'use strict';
const { allSupportedBrowsers, modernBrowsers } = require('./browserlists');

const isProduction = process.env.EMBER_ENV === 'production';
const shouldTranspile = Boolean(process.env.SHOULD_TRANSPILE);

module.exports = {
  browsers: isProduction || shouldTranspile ? allSupportedBrowsers : modernBrowsers,
  ...(process.env.SHOULD_TRANSPILE_FOR_NODE ? { node: 'current' } : undefined),
};
