/* eslint-disable no-console */
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import type { PackageEntryPoints } from 'pkg-entry-points';
import chalk from 'chalk';
import { execa } from 'execa';
import { getPackageEntryPointsSync } from 'pkg-entry-points';
import YAML from 'yaml';

import type { PackageInfo, RepoMetaForPackage } from './types';

interface PnpmPackage {
  name: string;
  version: string;
  path: string;
  private?: boolean;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

interface WorkspacePackage {
  rootDir: string;
  manifest: ManifestExt;
}

const workspaceRoot = new URL('../..', import.meta.url).pathname;
const metadataRoot = new URL('..', import.meta.url).pathname;

const workspaceFile = await readFile(join(workspaceRoot, 'pnpm-workspace.yaml'), 'utf8');
const workspaceInfo = YAML.parse(workspaceFile) as { packages: string[] };

// Get workspace packages using pnpm list instead of @pnpm/workspace.find-packages
// to avoid peer dependency issues with @pnpm/* internal packages
let pnpmPackages: PnpmPackage[];
try {
  const { stdout } = await execa('pnpm', ['list', '--recursive', '--json', '--depth=0'], {
    cwd: workspaceRoot,
  });
  pnpmPackages = JSON.parse(stdout) as PnpmPackage[];
} catch (error) {
  console.error(chalk.red('Failed to get workspace packages with pnpm list:'), error);
  throw new Error('Failed to get workspace packages');
}

const packages: WorkspacePackage[] = pnpmPackages.map((pkg) => {
  // Read the actual package.json to get all fields including repo-meta
  const packageJsonPath = join(pkg.path, 'package.json');

  if (!existsSync(packageJsonPath)) {
    console.error(chalk.red(`Missing package.json at ${packageJsonPath}`));
    throw new Error(`Missing package.json at ${packageJsonPath}`);
  }

  try {
    const fullManifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as ManifestExt;
    return {
      rootDir: pkg.path,
      manifest: fullManifest,
    };
  } catch (error) {
    console.error(chalk.red(`Failed to read/parse package.json at ${packageJsonPath}:`), error);
    throw new Error(`Failed to read/parse package.json at ${packageJsonPath}`);
  }
});

if (process.argv.includes('--print-list')) {
  for (const pkg of packages.sort()) {
    console.log(
      `${chalk.gray('-')} ${chalk.magenta(relative(workspaceRoot, pkg.rootDir) || '{root}')}`
    );
  }

  // eslint-disable-next-line n/no-process-exit
  process.exit(0);
}

interface ManifestExt {
  name?: string;
  version?: string;
  private?: boolean;
  type?: 'module' | 'commonjs';
  'repo-meta'?: RepoMetaForPackage;
}

const WARNINGS: Record<
  string,
  {
    name: string | undefined;
    problems: Record<string, { code: string; expected?: string | undefined }>;
  }
> = {};

function warn(pkg: WorkspacePackage, code: string, field: string, expected?: string) {
  const pkgRoot = relative(workspaceRoot, pkg.rootDir);
  let { problems } = (WARNINGS[pkgRoot] ??= { name: pkg.manifest.name, problems: {} });
  problems[field] = { code, expected };
}

const packagesMetadata = packages.map((pkg) => {
  const manifest = pkg.manifest;
  const { name, type, private: isPrivate = false } = manifest;

  assert(name, `Missing name in ${relative(workspaceRoot, pkg.rootDir)}/package.json`);

  if (!type) {
    warn(pkg, 'missing', 'type', 'module | commonjs');
  }

  const entryPoints = getPackageEntryPointsSync(pkg.rootDir);

  const metadata: PackageInfo = {
    root: relative(workspaceRoot, pkg.rootDir),
    name,
    version: manifest.version,
    type: manifest.type ?? 'commonjs',
    private: isPrivate,
  };

  const repoMeta = (pkg.manifest as Record<string, unknown>)['repo-meta'] as
    | RepoMetaForPackage
    | undefined;

  const meta = (metadata['repo-meta'] ??= { built: false });

  if (repoMeta) {
    assert(
      typeof repoMeta === 'object',
      `repo-meta in ${relative(workspaceRoot, pkg.rootDir)}/package.json must be an object`
    );

    if (repoMeta.strictness) meta.strictness = repoMeta.strictness;
    if (repoMeta.lint) meta.lint = Array.isArray(repoMeta.lint) ? repoMeta.lint : [repoMeta.lint];
    if (repoMeta.env) meta.env = repoMeta.env;
    if (repoMeta.built) meta.built = repoMeta.built;
    if (repoMeta.supportcjs) meta.supportcjs = repoMeta.supportcjs;
  }

  if (Object.keys(entryPoints).length > 0) {
    metadata.entryPoints = entryPoints;
  }

  // Public packages with buildable entry points are considered built by default. Other packages are
  // only considered built if they specify `"built": true` in their `repo-meta` field.
  //
  // This is because private packages with `.ts` files are typically built as part of another build
  // process. The only exception right now is `@glimmer-workspace/benchmark-env`, which is built
  // like a published package so that it can be used in the isolated benchmark environment.
  if (!manifest.private && hasBuildableEntryPoint(entryPoints)) {
    meta.built = true;
  }

  return metadata;
});

const rootPackage = packagesMetadata.find((pkg) => pkg.root === '');

if (!rootPackage) {
  throw new Error(
    `Could not find root package. The code in repo-metadata/lib/update.ts expects the metadata returned by findWorkspacePackages to include the root package with a root key of '', but no such package was found.`
  );
}

if (!rootPackage.version) {
  throw new Error(
    `Could not find 'version' in the root package.json. This version is used as the version of non-published packages, and is required.`
  );
}

const outFile = resolve(metadataRoot, 'metadata.json');
const next = JSON.stringify(
  {
    workspace: {
      packages: workspaceInfo.packages,
      version: rootPackage.version,
    },
    packages: packagesMetadata,
  },
  null,
  2
);
const prev = existsSync(outFile) ? readFileSync(outFile, 'utf-8') : null;

if (prev && next === JSON.stringify(JSON.parse(prev), null, 2)) {
  console.error(`No changes in ${relative(workspaceRoot, outFile)}`);
} else {
  writeFileSync(outFile, next, 'utf-8');
  try {
    await execa({ cwd: workspaceRoot })`pnpm prettier --write ${outFile}`;
  } catch (error) {
    console.error(chalk.yellow('Warning: Failed to format metadata.json with prettier:'), error);
  }
  console.error(`Updated ${relative(workspaceRoot, outFile)}`);
}

if (process.env['VERBOSE_WARNINGS']) {
  for (const [pkgRoot, { name, problems }] of Object.entries(WARNINGS)) {
    const packageJSON = `${pkgRoot}/package.json`;
    console.error(name ? `${name} (${packageJSON})` : packageJSON);

    for (const [field, { code, expected }] of Object.entries(problems)) {
      const problem = `${code} ${field}`;
      console.error(expected ? `  ${problem}: expected ${expected}` : `  ${problem}`);
    }

    console.groupEnd();
  }
}

function hasBuildableEntryPoint(entryPoints: PackageEntryPoints): boolean {
  return Object.entries(entryPoints).some(([_name, mappings]) =>
    mappings.some(([_conditions, path]) => isBuildableEntryPoint(path))
  );
}

function isBuildableEntryPoint(path: string): boolean {
  if (path.endsWith('.ts')) {
    return !path.endsWith('.d.ts');
  }

  if (path.endsWith('.mts')) {
    return !path.endsWith('.d.mts');
  }

  return false;
}
