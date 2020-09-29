export function createConsoleReport() {
  let testsTotal = 0;
  let testsPassed = 0;
  let testsFailed = 0;
  return {
    begin() {
      testsTotal = testsPassed = testsFailed = 0;
    },
    testDone(failed: boolean) {
      testsTotal++;
      if (failed) {
        testsFailed++;
      } else {
        testsPassed++;
      }
    },
    done(runtime: number) {
      console.log(
        '\n' +
          'Took ' +
          runtime +
          'ms to run ' +
          testsTotal +
          ' tests. ' +
          testsPassed +
          ' passed, ' +
          testsFailed +
          ' failed.'
      );
    },
  };
}
