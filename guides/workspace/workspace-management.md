The repository is organized into a number of packages, each with their own package.json.

## Workspace Configuration

The workspace is configured as a [pnpm workspace](https://pnpm.io/workspaces). The package locations
are specified in the `pnpm-workspace.yaml` file.

### Turbo

Repository workflows are managed by [Turbo](https://turbo.build). They are defined in the
`turbo.json` file. See [Turbo Workflows](#turbo-workflows) below for more details on the available
workflows.

### Repo Metadata

Repository metadata used by workspace tooling is cached in `repo-metadata/metadata.json`. This file
is updated by the repository's `repo:update-metadata` script. This script is a dependency of all
turbo workflows, which ensures that the metadata is up-to-date before running any scripts that
depend on them.

## Code Packages

Code packages are in the `packages/` directory. Packages can be authored as `.ts` or `.js` files,
but share a common directory structure.

- `index.{ext}`: The main entry point for the package. This is the only required source file.
- `lib/**/*.{ext}`: Other source files used or exported by the entry point.
- `test/`: Optional integration tests. The `test/` directory is its own package in the scope
  `@glimmer-test/*`. You can find more information about the structure of test packages
  below in the [`@glimmer-test/*` Packages](#glimmer-test-packages) section below.

### `@glimmer/*` Packages

Packages in the `packages/@glimmer/` directory contain code that is meant to be used by consumers of the
Glimmer VM project.

#### Published Packages

A subset of `@glimmer/*` packages are published to NPM. In addition to the common directory
structure for all code packages, published packages have some additional requirements.

##### Rollup Build

A rollup-based build script in the `rollup.config.mjs` file. This file is always identical:

```ts
import { Package } from "@glimmer-workspace/build-support";

export default Package.config(import.meta);
```

##### `package.json`

The `package.json` for published packages has some additional requirements:

- `publishConfig`: points the published package's exports to the `dist` directory.
- `scripts.build`: runs the rollup build: `rollup -c rollup.config.mjs`. This requires dev
  dependencies on `@glimmer-workspace/build-support` and `rollup`.
- `scripts.test:publint`: runs `publint`, which verifies that the `package.json` file is prepared
  correctly for publishing. This also requires a dev dependency on `publint`.
- `files`: always the `dist` directory

> [!IMPORTANT]
>
> Packages in the `@glimmer/*` directory with `"private": true` in their `package.json` are inlined
> into _other_ published packages by the build process. The list of inlined packages is currently
> hardcoded in `packages/@glimmer-workspace/build/lib/config.js`, but this will be updated soon to
> use the [`repo-metadata`](#repo-metadata) to automatically inline packages marked private.
>
> You can determine whether a package is published by looking at the `private` field in the
> `package.json` file.

### `@glimmer-workspace/*` Packages

Packages in the `packages/@glimmer-workspace/` contain code that will not be published and is used when developing the workspace.

## Test Packages

### `@glimmer-test/*` Packages

Packages in `@glimmer/*` or `@glimmer-workspace/\*

## Recommended IDE Workflow

TypeScript and ESLint are intended to automate workflow-wide development standards.

### Pre-Merge Workspace Annotations

These annotations are used to organize work during the lifetime of a pull request and should not be
merged to `main`.

<dl>
  <dt><code>@fixme</code></dt>
  <dd>This represents a problem that should be fixed before merge.</dd>
  <dt><code>@audit</code></dt>
  <dd>You can use this annotation to mark instances of code that
</dl>

### Workspace Annotations

These annotations identify areas of code in a structured way.

<dl>
  <dt><code>@todo</code></dt>
  <dd>This represents a problem. It should also contain a link to a GitHub issue.</dd>
</dl>

> [!NOTE]
>
> Currently, there is no enforcement of the requirements for these annotations. For now, please
> help enforce them in pull request reviews. We will add additional checks to enforce these
> requirements in the future.

## Turbo Workflows

### `build`

### `lint`

### `publint`
