#!/bin/bash

cd "$(dirname $0)/.."
EMBER_BIN="./node_modules/.bin/ember"
QUNIT_BIN="./node_modules/.bin/qunit"

${EMBER_BIN} build
${QUNIT_BIN} dist/tests/node_modules/@glimmer/node/test/**/*-test.js
