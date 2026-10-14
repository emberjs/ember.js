# {{name}}

Ember `{{version}}` built to run on [`@lifeart/gxt`](https://github.com/lifeart/glimmer-next)
instead of the Glimmer VM: the `gxt-native` build of `ember-source`
(`EMBER_RENDER_BACKEND=gxt-native`). Templates compile to gxt's reactive DOM
code and `@tracked` / tags are gxt cells, so there is one reactive system and
no VM in the app bundle.

**Preview.** Not covered by Ember's SemVer guarantees. Vite only.

## Install

The package replaces `ember-source`; install it under that name so addons that
peer-depend on `ember-source` are satisfied:

```jsonc
// package.json
{
  "dependencies": {
    "ember-source": "npm:{{name}}@{{version}}",
  },
}
```

It depends on `@lifeart/gxt` `{{gxtVersion}}` (exact pin; the Vite preset checks the
installed gxt provides every export the dist imports and refuses to build otherwise).

## Configure Vite

```js
// vite.config.mjs
import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { emberGxtNative } from 'ember-source/vite';

export default defineConfig({
  plugins: [
    emberGxtNative(),
    // decorators (`@tracked`, `@service`) in .js / .ts files
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts', '.gjs', '.gts'],
      plugins: [
        ['module:decorator-transforms', { runtime: { import: 'decorator-transforms/runtime' } }],
      ],
    }),
  ],
});
```

The app lists `decorator-transforms` (as an Embroider app does). Decorators in
`.gjs` / `.gts` need no babel of their own: the gxt compiler lowers them and,
under the native flags, makes each compiled module import
`decorator-transforms/runtime`, the runtime the babel config above uses for
`.js` / `.ts`. No `dt7948` global
is needed.

`emberGxtNative()`:

- resolves Ember's modules (`@ember/*`, `@glimmer/tracking`, …: the
  `renamed-modules` of this package) into `dist/dev` for the dev server /
  `--mode development` builds and `dist/prod` otherwise;
- resolves `@glimmer/component` to the copy shipped in this package and
  `@lifeart/gxt` to the gxt this package depends on — one copy of each in the
  bundle, whatever else is in `node_modules`;
- compiles `.gjs` / `.gts` and build-time `precompileTemplate()` with the gxt
  compiler under the flags this dist was built with
  (`dist/gxt-native-contract.json`); the decorators it lowers import
  `decorator-transforms/runtime`.

Do not add `@embroider/vite`'s `ember()` / `templateTag()` / `hbs()` /
`resolver()` or `babel-plugin-ember-template-compilation`; the preset fails the
build if it finds the @embroider/vite plugins.

## Supported

Strict-mode apps (`.gjs` / `.gts`, `ember-strict-application-resolver`),
`@glimmer/component`, template-only components, helpers / modifiers
(including custom managers), `@tracked` / `@cached` / tracked collections,
services, routing / `LinkTo` / `{{outlet}}`, `renderComponent`, loose-mode
templates through `precompileTemplate()`, runtime compilation through
`@ember/template-compiler`.

## Not supported

Refused loudly:

- Classic `@ember/component` `Component`, `<Input>`, `<Textarea>`: throw on use
  (use `@glimmer/component` / plain `<input>`).
- ember-cli / `@embroider/compat` builds: this package's addon main throws.
- Glimmer VM packages (`@glimmer/opcode-compiler`, `@glimmer/vm`,
  `@glimmer/node`, …) and the wire-format template compiler
  (`ember-template-compiler`): not shipped; the preset refuses the import and
  says why.
- A `@lifeart/gxt` without the exports this dist imports: the preset refuses
  to build.

No native implementation (not exercised by the package checks): engines /
`{{mount}}`, FastBoot / SSR, `.hbs` template files.
