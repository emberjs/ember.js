#!/bin/bash

PROJECT_ROOT=$(cd "$(dirname $0)/.."; pwd)
EMBER_BIN="${PROJECT_ROOT}/node_modules/.bin/ember"
QUNIT_BIN="${PROJECT_ROOT}/node_modules/.bin/qunit"

# When running inside `ember test`, we already have a build we can use.
if [ -d "$EMBER_CLI_TEST_OUTPUT" ]
then
  cd "$EMBER_CLI_TEST_OUTPUT"
  ${QUNIT_BIN} "tests/node_modules/@glimmer/node/test/**/*-test.js"
else
  # When running script directly, we need to build first to ensure we have tests
  # to run.
  cd "$PROJECT_ROOT"
  ${EMBER_BIN} build
  ${QUNIT_BIN} dist/tests/node_modules/@glimmer/node/test/**/*-test.js
fi

