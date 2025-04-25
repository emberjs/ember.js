## Linted Files

Packages in the repository have a default glob to lint.

| Package Type             | Linted Files        |
| ------------------------ | ------------------- |
| test (`@glimmer-test/*`) | `**/*`              |
| non-test                 | `index`, `lib/**/*` |

Unless otherwise specified, the following extensions are linted: `ts`, `js`, `mts`, `mjs`.

> [!NOTE]
>
> While extension overrides are supported by passing an `extensions` option to the `code` and
> `override` functions, these overrides are currently not used.

### Package Override

A package can override the default glob by specifying an array of globs under `repo-meta.lint` in
`package.json`. This key is an array of globs to lint.

> [!IMPORTANT]
>
> Globs specified this way must **not** include a file extension.

## Specifying the `@typescript-eslint` Config

For the most part, `@glimmer-workspace/eslint-plugin` unconditionally configures the linting plugins
and `extends` for all linted files in the repository.

However, each linting category must specify the `@typescript-eslint` config to use. This is
specified in `eslint.config.js` as follows:

```ts
import { code, tslint, config } from "@glimmer-workspace/eslint-plugin";

export default config([
  // ...

  code("loose packages", {
    filter: "strictness=loose",
    extends: [tslint.configs.recommendedTypeChecked],
    //        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // ...
    },
  }),

  // ...
]);
```

The `@typescript-eslint` configs are exposed by `@glimmer-workspace/eslint-plugin` as the `tslint`
export, which are documented [on the `typescript-eslint` website][typescript-eslint-configs].

[typescript-eslint-configs]: https://typescript-eslint.io/users/configs/

<details>
  <summary>🕵️ More Details About the Rest of the Configs</summary>

Plugins:

| Plugin                             | Rule Names             |
| ---------------------------------- | ---------------------- |
| `eslint-plugin-import-x`           | `import-x/*`           |
| `eslint-plugin-regexp`             | `regexp/*`             |
| `eslint-plugin-unused-imports`     | `unused-imports/*`     |
| `eslint-plugin-simple-import-sort` | `simple-import-sort/*` |
| `eslint-plugin-n`                  | `n/*`                  |

</details>

## Filters

The workspace's `eslint.config.js` specifies linting behavior based on filters defined by
`@glimmer-workspace/eslint-plugin`.

At present, there are three kinds of filters:

| Filter       | `package.json` key               | Description                    |
| ------------ | -------------------------------- | ------------------------------ |
| `strictness` | `strictness` key in `repo-meta`  | Strictness of TypeScript lints |
| `env`        | `env` key in `repo-meta` (array) | Special linting environments   |
| `scope`      | `name`                           | The package's npm scope        |

### Examples

<details>
<summary>A linting configuration that enables <code>no-console</code> linting for packages whose <code>repo-meta.env</code> does
not include <code>console</code></summary>

```ts
override('no-console packages', {
  filter: 'env!=console',
  rules: { 'no-console': 'error' },
}),
```

</details>

<details>
<summary>A linting configuration for packages whose <code>repo-meta.strictness</code> is not set to <code>loose</code> (<code>strict</code> is the default)</summary>

```ts
code('strict packages', {
  filter: 'strictness=strict',
  extends: [tslint.configs.strictTypeChecked],
  rules: {
    '@typescript-eslint/consistent-return': 'off',
    // ...
  }
}),
```

</details>

<details>
<summary>A linting configuration for test packages (i.e. whose npm scope is <code>@glimmer-test</code>)</summary>

```ts
code('test packages', {
  filter: 'scope=@glimmer-test',
  extends: [tslint.configs.recommendedTypeChecked, compat.extends('plugin:qunit/recommended')],
  rules: {
    'qunit/require-expect': ['error', 'never-except-zero'],
    // ...
  }
}),
```

</details>

### The `strictness` Filter

Set in `repo-meta.strictness` of `package.json` as a string.

- `strict`: Lint the package with strict `@typescript-eslint` settings. The settings are roughly
  [strict-type-checked](https://typescript-eslint.io/users/configs/#strict-type-checked) with some
  small modifications.
- `loose`: Lint the package with loose `@typescript-eslint` settings. The settings are roughly
  [recommended-type-checked](https://typescript-eslint.io/users/configs/#recommended-type-checked-only),
  but disables most safety lints. This allows explicit `any` types. This setting is a transitional
  mode. We expect to transition packages currently using `"strictness": "loose"` to `"strictness": "strict"` as time
  allows.

### The `env` Filter

Specifies additional environments to consider while linting. Set in `repo-meta.env` of
`package.json` as an array of strings.

| Environment         | Description                      |
| ------------------- | -------------------------------- |
| `console`           | Disable `no-console` linting.    |
| `node`              | Allow `node` globals and types.  |
| `qunit`             | Allow `qunit` globals and types. |
| `decorator:classic` | Allow classic decorators.        |

Not all of these environments currently drive linting behavior. They currently serve as
documentation and should drive linting behavior in the future once we decide on a linting strategy
for these environments.

### The `scope` Filter

Succeeds if the package has a matching `scope` in `package.json` (e.g. `scope=@glimmer-test` will
match packages whose names begin with `@glimmer-test/`).
