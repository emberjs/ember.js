# Glimmer Builds

Currently, Glimmer uses two distinct build pipelines.

The first comes from when the Glimmer repository was initially created and is
optimized for consumption by Ember and the ability to run code and tests in the
browser during development.

The second takes advantage of several notable improvements that have been made
to TypeScript and other tools since Glimmer began. These allow us to distribute
each subpackage as a standalone package on npm, including typings for TypeScript
users, CommonJS builds for Node.js users, and ES6 module output for people
bundling libraries with tools like Webpack or Rollup.

This document covers how we build and deploy packages to npm.

## How It Works

At a high level, each package is built for two output formats:

1. ES6 module format, for use by tools like Webpack and Rollup.
2. CommonJS format, for use from Node.js.

Both formats are built into a package's `dist` directory. Each package's
`package.json` is configured to point to the correct builds in `dist` depending
on how it is consumed.

### Lerna

Glimmer uses Lerna to manage a single "monorepo" that publishes multiple
packages to npm. For more information about Lerna, see the [README on
GitHub](https://github.com/lerna/lerna).

If a package depends on another package in the monorepo, Lerna will symlink it as part
of the bootstrapping process.

After cloning the repo for the first time, you'll need to run `lerna bootstrap` to created
these symlinks.

## Publishing New Versions

To publish a new version of the Glimmer packages to npm, run `lerna publish`.
This will build each package, prompt you for the new version number, publish to
npm, and finally create a new tag in Git for the release. Only packages that
have changed since the last release will be published.

## Updating or Creating New Packages

A shell script is included for adding npm publishing to an existing package, or
to create a new package with the correct configuration. To run the script, run
`build/init-package <package-name>` from the command line.

For example, to start publishing an existing package called `glimmer-syntax`:

```sh
build/init-package glimmer-syntax
```

This will:

1. Symlink a `tsconfig.json` into the package root.
2. Update the package's version to the current Lerna version.
3. Configure `main`, `jsnext:main`, `module` and `typings` fields.
4. Configure `build`, `prepublish` and `test` npm scripts.
5. Restrict published files to `dist` and `lib` via the `files` field.

To verify the script worked correctly, `cd` into the package directory and run
`npm run build` followed by `npm run test`.

### Cross-Package Dependencies

If the package depends on other Glimmer packages in the repository, you will
need to add them to the `dependencies` object in `package.json`. Once that's done,
symlink the dependencies by running `lerna bootstrap`.

### Shared Configuration

To keep everything in sync, build configuration and scripts are shared. Each
package has its own `tsconfig.json` that extends the base configuration.

1. `build/build` - Build script invoked by `npm run build`
2. `build/tsconfig.json` - Base TypeScript compiler configuration

### `package.json`

Each package has its own `package.json` with the following fields:

```js
{
  // Automatically updated by Lerna
  "version": "<version>",
  // Points to the index.js CommonJS file when the package is required from Node.
  "main": "dist/commonjs/index.js",
  // Points to the ES6 build when the package is required from web bundling tools like
  // Webpack and Rollup. Both fields are required for compatibility.
  "module": "dist/modules/index.js",
  "jsnext:main": "dist/modules/index.js",
  // Tells TypeScript where to find type declarations for the package.
  "typings": "index.ts",
  // Omits TypeScript source and other files from the npm package by restricting published files
  // to only the `dist` directory.
  "files": ["dist", "index.ts", "lib"],

  "scripts": {
    // Runs TypeScript compiler once per output format
    "build": "sh ../../build/build",
    // Runs the build before publishing to npm
    "prepublish": "npm run build",
    // Verifies the build succeeded by requiring the package from Node.
    "test": "node -e 'require(\".\")'"
  }
}
```
