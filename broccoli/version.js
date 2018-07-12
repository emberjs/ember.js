'use strict';

const buildInfo = require('./build-info')();

module.exports.VERSION = buildInfo.version;
