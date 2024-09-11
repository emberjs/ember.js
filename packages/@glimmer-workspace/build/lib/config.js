/* eslint-disable no-console */
// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import * as insert from 'rollup-plugin-insert';
import rollupTS from 'rollup-plugin-ts';
import ts from 'typescript';

import inline from './inline.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line import/no-named-as-default-member
const { ModuleKind, ModuleResolutionKind, ScriptTarget, ImportsNotUsedAsValues } = ts;

const { default: commonjs } = await import('@rollup/plugin-commonjs');
const { default: nodeResolve } = await import('@rollup/plugin-node-resolve');
const { default: postcss } = await import('rollup-plugin-postcss');
const { default: nodePolyfills } = await import('rollup-plugin-polyfill-node');
const { default: fonts } = await import('unplugin-fonts/vite');

/** @typedef {import("typescript").CompilerOptions} CompilerOptions */
/** @typedef {import("./config.js").ExternalOption} ExternalOption */
/** @typedef {import("./config.js").PackageInfo} PackageInfo */
/** @typedef {import("./config.js").PackageJSON} PackageJSON */
/** @typedef {import("./config.js").PackageJsonInline} PackageJsonInline */
/** @typedef {import("rollup").Plugin} RollupPlugin */
/** @typedef {import("rollup").RollupOptions} RollupOptions */
/**
 * @typedef {import("./config.js").ViteConfig} ViteConfig
 * @typedef {import("./config.js").JsonValue} JsonValue
 * @typedef {import("./config.js").JsonObject} JsonObject
 * @typedef {import("./config.js").JsonArray} JsonArray
 * @typedef {import("./config.js").PackageJSON} PackageJson
 */

/**
 * The package should be inlined into the output. In this situation, the `external` function should
 * return `false`. This is the default behavior.
 */
const INLINE = false;

/**
 * The package should be treated as an external dependency. In this situation, the `external` function
 * should return `true`. This is unusual and should be used when:
 *
 * - The package is a "helper library" (such as tslib) that we don't want to make a real dependency
 *   of the published package.
 * - (for now) The package doesn't have good support for ESM (i.e. `type: module` in package.json)
 *   but rollup will handle it for us.
 */
const EXTERNAL = true;

/**
 * @param {CompilerOptions} updates
 * @returns {CompilerOptions}
 */
export function tsconfig(updates) {
  return {
    declaration: true,
    declarationMap: true,
    verbatimModuleSyntax: true,
    module: ModuleKind.NodeNext,
    moduleResolution: ModuleResolutionKind.NodeNext,
    experimentalDecorators: true,
    ...updates,
  };
}

/**
 * @param {PackageInfo} pkg
 * @param {Partial<CompilerOptions>} [config]
 * @returns {RollupPlugin}
 */
export function typescript(pkg, config) {
  const typeScriptConfig = {
    ...config,
    paths: {
      '@glimmer/interfaces': [resolve(pkg.root, '../@glimmer/interfaces/index.d.ts')],
      '@glimmer/*': [resolve(pkg.root, '../@glimmer/*/src/dist/index.d.ts')],
    },
  };

  /** @type {[string, object][]} */
  const presets = [['@babel/preset-typescript', { allowDeclareFields: true }]];

  const ts = tsconfig(typeScriptConfig);

  /**
   * TODO: migrate off of rollupTS, it has too many bugs
   */
  return rollupTS({
    transpiler: 'babel',
    transpileOnly: true,
    babelConfig: {
      presets,
      plugins: [require.resolve('@glimmer/local-debug-babel-plugin')],
    },
    /**
     * This shouldn't be required, but it is.
     * If we use @rollup/plugin-babel, we can remove this.
     */
    browserslist: [`last 1 chrome versions`],
    tsconfig: ts,
  });
}

/** @type {['is' | 'startsWith', string[], 'inline' | 'external'][]} */
const EXTERNAL_OPTIONS = [
  ['is', ['tslib', '@glimmer/local-debug-flags', '@glimmer/debug'], 'inline'],
  ['is', ['@handlebars/parser', 'simple-html-tokenizer', 'babel-plugin-debug-macros'], 'external'],
  ['startsWith', ['.', '/', '#', '@babel/runtime/', process.cwd().replace(/\\/gu, '/')], 'inline'],
  ['startsWith', ['@glimmer/', '@simple-dom/', '@babel/', 'node:'], 'external'],
];

/**
 * @param {string} id
 * @returns {boolean | null}
 */
function matchExternals(id) {
  id = id.replace(/\\/gu, '/');
  for (const [operator, prefixes, kind] of EXTERNAL_OPTIONS) {
    const result = match(id, operator, prefixes);

    if (result) {
      return kind === 'inline' ? INLINE : EXTERNAL;
    }
  }

  return null;
}

/**
 * @template {string[]} Prefixes
 * @param {string} id
 * @param {'is' | 'startsWith'} operator
 * @param {Prefixes} prefixes
 */
function match(id, operator, prefixes) {
  return prefixes.some((prefix) => {
    switch (operator) {
      case 'is':
        return id === prefix;
      case 'startsWith':
        return id.startsWith(prefix);
    }
  });
}

/**
 * @implements {PackageInfo}
 */
export class Package {
  /**
   * @param {ImportMeta} meta
   * @returns {string}
   */
  static root(meta) {
    const dir = fileURLToPath(meta.url);
    return dirname(resolve(dir));
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {Package | undefined}
   */
  static at(meta) {
    const root = typeof meta === 'string' ? meta : Package.root(meta);

    /** @type {PackageJSON} */
    const json = parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

    if (json.main) {
      return new Package({
        name: json.name,
        main: resolve(root, json.main),
        root,
      });
    } else {
      for (const main of ['index.ts', 'index.js', 'index.d.ts']) {
        const path = resolve(root, main);
        if (existsSync(path)) {
          return new Package({
            name: json.name,
            main: path,
            root,
          });
        }
      }

      console.warn(`No main entry point found for ${json.name} (in ${root})`);
    }
  }

  /**
   * @param {ImportMeta | string} meta
   * @param {Formats} [formats]
   * @returns {import("./config.js").RollupExport}
   */
  static config(meta, formats) {
    const pkg = Package.at(meta);

    if (pkg) {
      return pkg.config(formats);
    } else {
      return [];
    }
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {Promise<ViteConfig>}
   */
  static async viteConfig(meta) {
    const pkg = Package.at(meta);

    if (pkg) return pkg.#viteConfig();

    throw Error(`No package found at ${typeof meta === 'string' ? meta : Package.root(meta)}`);
  }

  /** @readonly @type {PackageInfo} */
  #package;

  /***
   * @param {PackageInfo} pkg
   */
  constructor(pkg) {
    this.#package = pkg;
  }

  /**
   * @returns {string}
   */
  get name() {
    return this.#package.name;
  }

  /**
   * @returns {string}
   */
  get root() {
    return this.#package.root;
  }

  /**
   * @returns {string}
   */
  get main() {
    return this.#package.main;
  }

  /**
   * @typedef {object} Formats
   * @property {boolean} [ esm ] enabled by default
   * @property {boolean} [ cjs ] enabled by default until eslint-plugin-ember and ember-source no longer need it
   *
   * @returns {import("rollup").RollupOptions[] | import("rollup").RollupOptions}
   */
  config(formats = {}) {
    let builds = [];

    if (formats.esm ?? true) {
      builds.push(...this.rollupESM({ env: 'dev' }));
      builds.push(...this.rollupESM({ env: 'prod' }));
    }

    if (formats.cjs ?? true) {
      builds.push(...this.rollupCJS({ env: 'dev' }));
    }

    return builds;
  }

  /**
   * @returns {Promise<import("./config.js").ViteConfig>}
   */
  async #viteConfig() {
    return viteConfig({
      plugins: [
        fonts({
          google: {
            families: ['Roboto:wght@300;400;500;700'],
            display: 'swap',
            preconnect: true,
          },
        }),
      ],
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
      },
      build: {},
    });
  }

  /**
   * @typedef {object} RollupConfigurationOptions
   * @property {'dev' | 'prod'} env
   *
   * @param {RollupConfigurationOptions} options
   * @returns {RollupOptions[]}
   */
  rollupESM({ env }) {
    return this.#shared('esm', env).map((options) => ({
      ...options,
      external: this.#external,
      plugins: [
        inline(),
        nodePolyfills(),
        commonjs(),
        nodeResolve(),
        ...this.replacements(env),
        ...(env === 'prod'
          ? [
              terser({
                module: true,
                // to debug the output, uncomment this so you can read the
                // identifiers, unchanged
                // mangle: false,
                compress: {
                  passes: 3,
                },
              }),
            ]
          : [
              terser({
                module: true,
                mangle: false,
                compress: {
                  passes: 3,
                },
                format: {
                  comments: 'all',
                  beautify: true,
                },
              }),
            ]),
        postcss(),
        typescript(this.#package, {
          target: ScriptTarget.ES2022,
          importsNotUsedAsValues: ImportsNotUsedAsValues.Preserve,
        }),
      ],
    }));
  }

  /**
   * @param {RollupConfigurationOptions} options
   * @returns {import("rollup").RollupOptions[]}
   */
  rollupCJS({ env }) {
    return this.#shared('cjs', env).map((options) => ({
      ...options,
      external: this.#external,
      plugins: [
        inline(),
        nodePolyfills(),
        commonjs(),
        nodeResolve(),
        ...this.replacements(env),
        postcss(),
        typescript(this.#package, {
          target: ScriptTarget.ES2021,
          module: ModuleKind.CommonJS,
          moduleResolution: ModuleResolutionKind.NodeJs,
        }),
      ],
    }));
  }

  /**
   * We only want importMeta stripped for production builds
   * @param {'dev' | 'prod'} env
   * @returns {any}
   */
  replacements(env) {
    return env === 'prod'
      ? [
          replace({
            preventAssignment: true,
            values: {
              // Intended to be left in the build during publish
              // currently compiled away to `@glimmer/debug`
              'import.meta.env.MODE': '"production"',
              'import.meta.env.DEV': 'false',
              'import.meta.env.PROD': 'true',
              // Not exposed at publish, compiled away
              'import.meta.env.VM_LOCAL_DEV': 'false',
            },
          }),
        ]
      : [
          replace({
            preventAssignment: true,
            values: {
              'import.meta.env.DEV': 'DEBUG',
              'import.meta.env.PROD': '!DEBUG',
              'import.meta.env.VM_LOCAL_DEV': 'false',
            },
          }),
          insert.transform((_magicString, code, _id) => {
            if (code.includes('DEBUG')) {
              return `import { DEBUG } from '@glimmer/env';\n` + code;
            }
            return code;
          }),
        ];
  }

  /**
   * @return {(id: string) => boolean}
   */
  get #external() {
    /**
     * @param {string} id
     * @returns {boolean}
     */
    return (id) => {
      const external = matchExternals(id);

      if (external === null) {
        console.warn('unhandled external', id);
        return true;
      } else {
        return external;
      }
    };
  }

  /**
   * @param {"esm" | "cjs"} format
   * @param {"dev" | "prod"} env
   * @returns {import("rollup").RollupOptions[]}
   */
  #shared(format, env) {
    const { root, main } = this.#package;

    const ext = format === 'esm' ? 'js' : 'cjs';

    const experiment = process.env['GLIMMER_EXPERIMENT'];

    /**
     * @param {[string, string]} entry
     * @returns {import("rollup").RollupOptions}
     */
    function entryPoint([exportName, ts]) {
      const file =
        experiment === undefined ? `${exportName}.${ext}` : `${exportName}.${experiment}.${ext}`;

      return {
        input: resolve(root, ts),
        treeshake: {
          // moduleSideEffects: false,
          moduleSideEffects: (id, external) => !external,
        },
        output: {
          file: resolve(root, 'dist', env, file),
          format,
          sourcemap: true,
          hoistTransitiveImports: false,
          exports: format === 'cjs' ? 'named' : 'auto',
        },
        onwarn: (warning, warn) => {
          switch (warning.code) {
            case 'CIRCULAR_DEPENDENCY':
            case 'EMPTY_BUNDLE':
              return;
            default:
              warn(warning);
          }
        },
      };
    }

    return [entryPoint([`index`, main])];
  }
}

/**
 * @param {import("./config.js").ViteConfig} config
 */
async function viteConfig(config) {
  return Promise.resolve(config);
}

/**
 * @template T
 * @param {string} string
 * @returns {T}
 */
function parse(string) {
  return JSON.parse(string);
}
