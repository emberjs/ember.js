#!/usr/bin/env bash
# This exists as a shell script so that the pkg-size action can
# more ergonomically invoke multiple commands, change directories, etc

pnpm build

( cd smoke-tests/v2-app-hello-world-template && pnpm vite build )
