import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import chalk from 'chalk';

import type { Package } from './packages.mjs';

import { packages } from './packages.mjs';

const ROLLUP_CONFIG = [
  `import { Package } from '@glimmer-workspace/build-support'`,
  `export default Package.config(import.meta)`,
]
  .map((line) => `${line};\n`)
  .join('\n');

for (const pkg of packages('@glimmer')) {
  if (pkg.private) {
    console.error(`Unexpected private package in @glimmer namespace`, pkg.name);
  } else {
    const updated = [];
    const { updates, packageJSON } = update(pkg, updatePublic);
    updated.push(...updates);
    updated.push(...updateRollupConfig(pkg, packageJSON));

    report(pkg, updated);
  }
}

for (const pkg of packages('@glimmer-workspace')) {
  const { updates } = update(pkg, updateUniversalScripts);
  report(pkg, updates);
}

function report(pkg: Package, updates: string[]) {
  if (updates.length > 0) {
    const marker = updates.length > 1 ? chalk.magenta(` (${updates.length}) `) : '';
    console.log(
      `${chalk.gray('-')} ${chalk.yellowBright(pkg.name)}${marker} ${chalk.gray(
        updates.join(', ')
      )}`
    );
  } else {
    console.log(`${chalk.gray('-')} ${chalk.gray(pkg.name)}`);
  }
}

interface PackageJSON extends Record<string, unknown> {
  name?: string | undefined;
  main?: string | undefined;
  types?: string | undefined;
  scripts?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
  config?:
    | {
        tsconfig?: string | undefined;
      }
    | undefined;
}

function update(
  pkg: Package,
  updater: (packageJSON: PackageJSON) => PackageJSON
): { updates: string[]; packageJSON: PackageJSON } {
  let packageJSON = JSON.parse(
    readFileSync(`${pkg.path}/package.json`, { encoding: 'utf-8' })
  ) as PackageJSON;
  const original = JSON.stringify(packageJSON);

  packageJSON = updater(packageJSON);

  if (original === JSON.stringify(packageJSON)) {
    return { updates: [], packageJSON };
  }
  writeFileSync(`${pkg.path}/package.json`, JSON.stringify(packageJSON, null, 2), {
    encoding: 'utf-8',
  });

  return { updates: ['package.json'], packageJSON };
}

function updateRollupConfig(pkg: Package, packageJSON: PackageJSON): string[] {
  if (packageJSON.main === 'index.d.ts') return [];

  const config = resolve(pkg.path, 'rollup.config.mjs');

  if (existsSync(config)) {
    const contents = readFileSync(config, { encoding: 'utf-8' });
    if (contents === ROLLUP_CONFIG) return [];
  }

  writeFileSync(config, ROLLUP_CONFIG, { encoding: 'utf-8' });
  return ['rollup.config.mjs'];
}

function updatePublic(packageJSON: PackageJSON) {
  return updateExports(updatePublicDependencies(updatePublicScripts(packageJSON)));
}

function updatePublicScripts(packageJSON: PackageJSON) {
  return updateBuildScripts(updateUniversalScripts(packageJSON));
}

function updatePublicDependencies(packageJSON: PackageJSON) {
  return {
    ...packageJSON,
    devDependencies: {
      ...packageJSON.devDependencies,
      '@glimmer-workspace/build-support': 'workspace:*',
    },
  };
}

function updateBuildScripts(packageJSON: PackageJSON) {
  if (packageJSON.main === 'index.d.ts') return packageJSON;

  return updateScripts(packageJSON, {
    build: 'rollup -c rollup.config.mjs',
  });
}

function updateExports(packageJSON: PackageJSON) {
  if (packageJSON.main === 'index.js' || packageJSON.main === 'index.mjs') {
    if (packageJSON.types === 'index.d.ts' || packageJSON.types === 'index.d.mts') {
      return {
        ...packageJSON,
        exports: {
          types: `./${packageJSON.types}`,
          default: `./${packageJSON.main}`,
        },
      };
    }
    return {
      ...packageJSON,
      exports: {
        default: './index.js',
      },
    };
  }

  if (packageJSON.main === 'index.d.ts') {
    return { ...packageJSON, types: 'index.d.ts', exports: { types: './index.d.ts' } };
  }

  return {
    ...packageJSON,
    main: 'index.ts',
    types: 'index.ts',
    publishConfig: {
      access: 'public',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      exports: {
        types: './dist/index.d.ts',
        require: './dist/index.cjs',
        default: './dist/index.js',
      },
    },
  };
}

function updateUniversalScripts(packageJSON: PackageJSON) {
  const tsconfig = packageJSON.config?.tsconfig ?? '../tsconfig.json';

  return updateScripts(packageJSON, {
    'test:lint': 'eslint .',
    'test:types': `tsc --noEmit -p ${tsconfig}`,
  });
}

function updateScripts(packageJSON: PackageJSON, updates: Record<string, string>) {
  return {
    ...packageJSON,
    scripts: {
      ...packageJSON.scripts,
      ...updates,
    },
  };
}
