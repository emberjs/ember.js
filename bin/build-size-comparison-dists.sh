#!/usr/bin/env bash
# This exists as a shell script so that the pkg-size action can
# more ergonomically invoke multiple commands, change directories, etc

pnpm build

( cd smoke-tests/v2-app-hello-world-template && pnpm vite build )
( cd smoke-tests/v2-app-template && pnpm vite build )

# the same apps consuming the modern (legacy-free) build variant
( cd smoke-tests/v2-app-hello-world-modern-template && pnpm vite build )
( cd smoke-tests/v2-app-modern-template && pnpm vite build )
