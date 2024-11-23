/* eslint-disable no-console */
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import type { Project, ProjectManifest } from '@pnpm/types';
import { findWorkspacePackagesNoCheck } from '@pnpm/workspace.find-packages';
import { execa } from 'execa';
import { getPackageEntryPointsSync } from 'pkg-entry-points';

import type { PackageInfo, RepoMeta } from './types';

const workspaceRoot = new URL('../..', import.meta.url).pathname;
const metadataRoot = new URL('..', import.meta.url).pathname;

const packages = await findWorkspacePackagesNoCheck(workspaceRoot);

interface ManifestExt extends ProjectManifest {
  type?: 'module' | 'commonjs';
  'repo-meta'?: RepoMeta;
}

const WARNINGS: Record<
  string,
  {
    name: string | undefined;
    problems: Record<string, { code: string; expected?: string | undefined }>;
  }
> = {};

function warn(pkg: Project, code: string, field: string, expected?: string) {
  const pkgRoot = relative(workspaceRoot, pkg.rootDir);
  let { problems } = (WARNINGS[pkgRoot] ??= { name: pkg.manifest.name, problems: {} });
  problems[field] = { code, expected };
}

const metadata = packages.map((pkg) => {
  const manifest = pkg.manifest as ManifestExt;
  const { name, type, private: isPrivate = false } = manifest;

  assert(name, `Missing name in ${relative(workspaceRoot, pkg.rootDir)}/package.json`);

  if (!type) {
    warn(pkg, 'missing', 'type', 'module | commonjs');
  }

  const entryPoints = getPackageEntryPointsSync(pkg.rootDir);

  const metadata: PackageInfo = {
    root: relative(workspaceRoot, pkg.rootDir),
    name,
    type: manifest.type ?? 'commonjs',
    private: isPrivate,
  };

  const repoMeta = (pkg.manifest as Record<string, unknown>)['repo-meta'] as RepoMeta | undefined;

  if (repoMeta) {
    assert(
      typeof repoMeta === 'object',
      `repo-meta in ${relative(workspaceRoot, pkg.rootDir)}/package.json must be an object`
    );

    const meta = (metadata['repo-meta'] ??= {});
    if (repoMeta.strictness) meta.strictness = repoMeta.strictness;
    if (repoMeta.lint) meta.lint = Array.isArray(repoMeta.lint) ? repoMeta.lint : [repoMeta.lint];
    if (repoMeta.env) meta.env = repoMeta.env;
  }

  if (Object.keys(entryPoints).length > 0) {
    metadata.entryPoints = entryPoints;
  }

  return metadata;
});

const outFile = resolve(metadataRoot, 'metadata.json');
const next = JSON.stringify(metadata, null, 2);
const prev = existsSync(outFile) ? readFileSync(outFile, 'utf-8') : null;

if (prev && next === JSON.stringify(JSON.parse(prev), null, 2)) {
  console.error(`No changes in ${relative(workspaceRoot, outFile)}`);
} else {
  writeFileSync(outFile, next, 'utf-8');
  await execa({ cwd: workspaceRoot })`pnpm prettier --write ${outFile}`;
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
