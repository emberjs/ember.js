#!/bin/bash

pnpm build:js

( cd smoke-tests/scenarios \
    && pnpm test:output --scenario embroiderVite-basic \
    && pnpm test --filter embroiderVite-basic \
  )
