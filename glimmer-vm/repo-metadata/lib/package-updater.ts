/* eslint-disable no-console */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import chalk from 'chalk';
import deepmerge from 'deepmerge';
import { globby } from 'globby';
import Handlebars from 'handlebars';
import { readPackage } from 'read-pkg';
import { writePackage } from 'write-pkg';

import type { PackageInfo } from './types.js';

import { getPackageInfo, WORKSPACE_ROOT } from '../index.js';
import metadata from '../metadata.json' with { type: 'json' };

interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  type?: 'module' | 'commonjs';
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
  publishConfig?: {
    access?: string;
    exports?: Record<string, unknown>;
    types?: string;
  };
  scripts?: Record<string, string>;
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface UpdateContext {
  manifest: PackageManifest;
  packageInfo: PackageInfo;
  isPublished: boolean;
  isRoot: boolean;
  isBuilt: boolean;
}

// Catalog of devDependencies to sync
const CATALOG = {
  devDependencies: {
    rollup: '^4.34.8',
  },
};

// Handlebars template for rollup.config.mjs
const ROLLUP_CONFIG_TEMPLATE =
  Handlebars.compile(`import { Package } from '@glimmer-workspace/build-support';

export default Package.config(import.meta);
`);

export class PackageUpdater {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = WORKSPACE_ROOT) {
    this.workspaceRoot = workspaceRoot;
  }

  async updateAllPackages(): Promise<void> {
    console.log(chalk.blue('Updating package conventions...'));

    // Discover all packages using globby (replacing @pnpm/workspace.find-packages)
    const packagePaths = await globby(
      [
        'packages/@glimmer/*/package.json',
        'packages/@glimmer-workspace/*/package.json',
        'packages/@types/*/package.json',
      ],
      {
        cwd: this.workspaceRoot,
        absolute: true,
      }
    );

    let updatedCount = 0;

    console.log(chalk.gray(`Found ${packagePaths.length} packages to check`));

    for (const packagePath of packagePaths) {
      const updated = await this.updatePackage(packagePath);
      if (updated) {
        updatedCount++;
      }
    }

    console.log(chalk.green(`Updated ${updatedCount} packages`));
  }

  private async updatePackage(packagePath: string): Promise<boolean> {
    try {
      // Read package.json using read-pkg for normalization
      const manifest = await readPackage({ cwd: packagePath.replace('/package.json', '') });

      if (!manifest.name) {
        return false;
      }

      const packageInfo = getPackageInfo(manifest.name);
      if (!packageInfo) {
        console.log(chalk.yellow(`No metadata found for ${manifest.name}`));
        return false;
      }

      const context: UpdateContext = {
        manifest,
        packageInfo,
        isPublished: !packageInfo.private,
        isRoot: packageInfo.name === 'glimmer-engine',
        isBuilt: packageInfo['repo-meta']?.built === true,
      };

      // Update package.json
      const updatedManifest = this.updatePackageManifest(context);
      const manifestChanged = JSON.stringify(manifest) !== JSON.stringify(updatedManifest);

      // Generate rollup.config.mjs if needed
      const rollupConfigPath = join(packagePath.replace('/package.json', ''), 'rollup.config.mjs');
      const rollupConfigChanged = this.updateRollupConfig(context, rollupConfigPath);

      if (manifestChanged) {
        await writePackage(packagePath.replace('/package.json', ''), updatedManifest);
        this.logUpdate(packageInfo.root, 'package.json');
      }

      // Log status for packages that are already up to date
      if (!manifestChanged && !rollupConfigChanged) {
        console.log(chalk.gray(`  ✓ ${packageInfo.name} is up to date`));
      }

      return manifestChanged || rollupConfigChanged;
    } catch (error) {
      console.error(chalk.red(`Failed to update package at ${packagePath}:`), error);
      return false;
    }
  }

  private updatePackageManifest(context: UpdateContext): PackageManifest {
    const { manifest, packageInfo, isPublished, isRoot, isBuilt } = context;

    // Start with a deep copy
    const updated = deepmerge({}, manifest) as PackageManifest;

    // Initialize required objects
    updated.publishConfig = updated.publishConfig || {};
    updated.scripts = updated.scripts || {};

    // Clean up legacy scripts (replaced with prepack)
    delete updated.scripts['test:types'];
    delete updated.scripts['test:lint'];

    // Repository configuration
    if (isPublished || isRoot) {
      updated.repository = {
        type: 'git',
        url: 'git+https://github.com/glimmerjs/glimmer-vm.git',
        ...(packageInfo.root ? { directory: packageInfo.root } : {}),
      };
    } else {
      delete updated.repository;
    }

    // Published package configuration
    if (isPublished) {
      updated.publishConfig.access = 'public';
    }

    // Private package configuration
    if (!isPublished && !isBuilt) {
      // Reset publishConfig for private non-built packages
      updated.publishConfig = {};
      updated.version = metadata.workspace.version; // Use workspace version

      // Root package special handling
      if (isRoot) {
        // Only add test:lint if it doesn't already exist
        if (!updated.scripts['test:lint']) {
          updated.scripts['test:lint'] = 'eslint . --quiet';
        }
      } else {
        delete updated.repository;
      }

      delete updated.scripts['test:publint'];
      this.cleanup(updated, 'publishConfig');
      return updated;
    }

    // Built packages and published packages
    updated.scripts['test:publint'] = 'publint';

    // Sync devDependencies from catalog
    updated.devDependencies = updated.devDependencies || {};
    for (const [name, version] of Object.entries(CATALOG.devDependencies)) {
      if (name in updated.devDependencies) {
        updated.devDependencies[name] = version;
      }
    }

    // Built package configuration
    if (isBuilt) {
      updated.devDependencies['@glimmer-workspace/env'] = 'workspace:*';
      updated.scripts['prepack'] = 'rollup -c rollup.config.mjs';
      updated.files = ['dist'];

      // Configure exports
      if (packageInfo.name === '@glimmer/vm-babel-plugins') {
        // Special case for babel plugins
        updated.publishConfig.exports = {
          '.': {
            development: {
              default: './dist/dev/index.js',
            },
            ...(packageInfo['repo-meta']?.supportcjs
              ? {
                  require: {
                    default: './dist/dev/index.cjs',
                  },
                }
              : {}),
            default: {
              default: './dist/prod/index.js',
            },
          },
        };
      } else {
        // Standard built package exports
        updated.publishConfig.types = 'dist/dev/index.d.ts';
        updated.publishConfig.exports = {
          '.': {
            development: {
              types: './dist/dev/index.d.ts',
              default: './dist/dev/index.js',
            },
            ...(packageInfo['repo-meta']?.supportcjs
              ? {
                  require: {
                    default: './dist/dev/index.cjs',
                  },
                }
              : {}),
            default: {
              types: './dist/prod/index.d.ts',
              default: './dist/prod/index.js',
            },
          },
        };
      }
    } else {
      // Non-built packages
      delete updated.publishConfig.exports;
      delete updated.scripts['prepack'];
    }

    // Cleanup empty objects
    this.cleanup(updated, 'publishConfig');
    this.cleanup(updated, 'devDependencies');

    return updated;
  }

  private updateRollupConfig(context: UpdateContext, rollupConfigPath: string): boolean {
    const { packageInfo, isBuilt, isRoot } = context;

    if (isRoot) {
      // Root package doesn't get a rollup config
      if (existsSync(rollupConfigPath)) {
        // Remove existing rollup config if present
        writeFileSync(rollupConfigPath, '');
        this.logUpdate(packageInfo.root, 'rollup.config.mjs (removed)');
        return true;
      }
      return false;
    }

    if (isBuilt) {
      // Generate rollup config for built packages
      const configContent = ROLLUP_CONFIG_TEMPLATE({});
      const existingContent = existsSync(rollupConfigPath)
        ? readFileSync(rollupConfigPath, 'utf8')
        : '';

      if (existingContent !== configContent) {
        writeFileSync(rollupConfigPath, configContent);
        this.logUpdate(packageInfo.root, 'rollup.config.mjs');
        return true;
      }
    } else {
      // Remove rollup config for non-built packages
      if (existsSync(rollupConfigPath)) {
        writeFileSync(rollupConfigPath, '');
        this.logUpdate(packageInfo.root, 'rollup.config.mjs (removed)');
        return true;
      }
    }

    return false;
  }

  private cleanup(obj: Record<string, unknown>, key: string): void {
    const value = obj[key];
    if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) {
      obj[key] = undefined;
    }
  }

  private logUpdate(packageRoot: string, file: string): void {
    const [prefix, rest] = packageRoot.startsWith('packages/')
      ? ['packages/', packageRoot.slice('packages/'.length)]
      : ['', packageRoot || '{root}'];

    console.log(
      `${chalk.green.bold('updating')} ${chalk.gray.dim(prefix)}${chalk.magenta.underline(
        rest
      )}${chalk.gray('/')}${chalk.cyanBright(file)}`
    );
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new PackageUpdater();
  try {
    await updater.updateAllPackages();
  } catch (error: unknown) {
    console.error(chalk.red('Failed to update packages:'), error);
    process.exit(1);
  }
}
