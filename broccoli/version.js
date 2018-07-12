'use strict';

const buildInfo = require('../broccoli/build-info').buildInfo();

module.exports.VERSION = buildInfo.version;
