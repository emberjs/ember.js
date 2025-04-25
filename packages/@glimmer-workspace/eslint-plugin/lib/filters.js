/**
 * @import { RepoMeta, PackageFilter } from './types';
 * @import { RepoMetaEnv } from '@glimmer-workspace/repo-metadata';
 */

const DEFAULT_STRICTNESS = 'strict';

/**
 * @param {Extract<RepoMeta['strictness'], string>} filter
 * @returns {PackageFilter}
 */
export function strictness(filter) {
  return {
    matches: (pkg) => {
      const strictness = pkg['repo-meta']?.strictness;

      if (strictness === undefined && filter === DEFAULT_STRICTNESS) {
        return true;
      } else {
        return strictness === filter;
      }
    },
    desc: (strictness, operator) => {
      const desc = `repo-meta.strictness is ${operator === '!=' ? 'not' : ''}${strictness}`;
      return strictness === DEFAULT_STRICTNESS ? `${desc}, the default` : desc;
    },
  };
}

/**
 * @param {string} scope
 * @returns {PackageFilter}
 */
export function scope(scope) {
  return {
    matches: (pkg) => !!pkg.name.startsWith(`${scope}/`),
    desc: (scope, operator) => `scope ${operator === '!=' ? 'is not ' : 'is'} ${scope}`,
  };
}

/**
 * @param {RepoMetaEnv} env
 * @returns {PackageFilter}
 */
export function env(env) {
  return {
    matches: (pkg) => !!pkg['repo-meta']?.env?.includes(env),
    desc: (env, operator) =>
      `repo-meta.env ${operator === '!=' ? 'does not include' : 'includes'} \`${env}\``,
  };
}
