#!/usr/bin/env bash

if [ "$CI" != "" ]; then
  echo "We don't run postinstall in CI"

  exit 0
fi

 node --disable-warning=ExperimentalWarning --experimental-strip-types ./bin/bench-packages.mts

