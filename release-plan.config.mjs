/**
 * Options for the whole repo.
 * Options for one package go in the "release-plan" key of its package.json.
 *
 * https://github.com/NullVoxPopuli/release-plan/blob/next/docs/changelog.md
 */
export default {
  /**
   * The heading sets the impact of a PR:
   * Breaking Change is major, Enhancement is minor, the rest are patch.
   *
   * Setting labels replaces the default list,
   * so the defaults are repeated here.
   */
  labels: {
    breaking: ':boom: Breaking Change',
    enhancement: ':rocket: Enhancement',
    bug: ':bug: Bug Fix',
    bugfix: ':bug: Bug Fix',
    documentation: ':memo: Documentation',
    internal: ':house: Internal',
  },

  /**
   * NullVoxPopuli-ai-agent is a bot account that opens PRs for NullVoxPopuli.
   */
  renameCommitters: {
    'NullVoxPopuli-ai-agent': 'NullVoxPopuli',
  },
};
