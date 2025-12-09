export default {
  ignore: [
    '.reference/**',
    'smoke-tests/**',
    'benchmark/**',
    'guides/**',
    // Test files are expected to be unused
    '**/test/**',
    // Build artifacts
    '**/dist/**',
    'ts-dist/**',
  ],
  ignoreDependencies: [
    // Testing - these are used by test runner
    'puppeteer',
    'puppeteer-chromium-resolver',
    'vitest',

    // Scripts and CLI tools
    'auto-dist-tag',
    'dotenv-cli',
    'tracerbench',
    'zx',

    // Type packages
    '@types/node',

    // Monorepo dependencies needed for hoisting
    'typescript',
    'eslint',
    'rollup',
  ],
  workspaces: {
    bin: {
      entry: ['*.mts', '*.mjs'],
    },
    'packages/*': {
      entry: ['index.{ts,js,mjs}', 'lib/**/*.{ts,js,mjs}'],
      ignore: ['test/**', '**/*.d.ts'],
    },
    'packages/*/test': {
      entry: [],
    },
  },
};
