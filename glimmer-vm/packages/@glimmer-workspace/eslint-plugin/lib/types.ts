import type { PackageInfo } from '@glimmer-workspace/repo-metadata';
import type { Project } from '@pnpm/workspace.find-packages';
import type { Linter } from 'eslint';
import type { ConfigArray, InfiniteDepthConfigWithExtends } from 'typescript-eslint';

import type * as filters from './filters';

export type Filters = typeof filters;
export type FilterName = keyof Filters;

export type PackageQuery = {
  [P in FilterName]: `${P}=${Parameters<Filters[P]>[0]}` | `${P}!=${Parameters<Filters[P]>[0]}`;
}[FilterName];

type PackageFilterParam<F extends FilterName> = Parameters<Filters[F]>[0];

export type SomePackageFilter = {
  [P in FilterName]: {
    matches: (pkg: PackageInfo) => boolean;
    desc: (param: PackageFilterParam<P>, operator: '=' | '!=') => string;
  };
}[FilterName];

export interface RepoMeta {
  strictness?: 'strict' | 'loose';
  lint?: string;
}

export type WorkspacePackage = Project & { manifest: { 'repo-meta'?: RepoMeta } };

export interface PackageFilter {
  matches: (pkg: PackageInfo) => boolean;
  desc: (param: string, operator: '=' | '!=') => string;
}

export type ConfigOptions = Omit<ConfigArray[number], 'extends' | 'rules' | 'name'> & {
  filter: PackageQuery;
  rules?: Linter.RulesRecord;
  extends?: InfiniteDepthConfigWithExtends[];
  extensions?: string[];
};
