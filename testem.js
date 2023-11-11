module.exports = {
  /**
   * disable_local_debug was added as a supported dev-time glimmer-vm feature and lives here:
   *   https://github.com/glimmerjs/glimmer-vm/blob/master/packages/%40glimmer/local-debug-flags/index.ts
   *
   * It was introduced in: https://github.com/glimmerjs/glimmer-vm/pull/1427
   */
  test_page: 'tests/index.html?hidepassed&disable_local_debug',
  timeout: 540,
  parallel: 4,
  disable_watching: true,
  launch_in_dev: [],
};
