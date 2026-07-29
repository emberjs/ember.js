#!/usr/bin/env bash
# This exists as a shell script so that the pkg-size action can
# more ergonomically invoke multiple commands, change directories, etc

pnpm build

( cd smoke-tests/v2-app-hello-world-template && pnpm vite build )
( cd smoke-tests/v2-app-template && pnpm vite build )

# the same apps consuming the modern (legacy-free) build variant; hello-world
# is the identical app rebuilt with the ember-modern condition, the full app
# has its own template (v2-app-template is blueprint-regenerated and its
# inspector support cannot build against the modern variant)
( cd smoke-tests/v2-app-hello-world-template && EMBER_MODERN=1 pnpm vite build --outDir dist-modern )
( cd smoke-tests/v2-app-modern-template && pnpm vite build )
