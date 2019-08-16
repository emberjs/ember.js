/* eslint-env browser */
/* eslint-disable no-console */
/* globals QUnit */
'use strict';
document.addEventListener('DOMContentLoaded', function() {
  let testsTotal = 0;
  let testsPassed = 0;
  let testsFailed = 0;
  let currentTestAssertions = [];
  QUnit.log(function(details) {
    let response;

    // Ignore passing assertions
    if (details.result) {
      return;
    }

    response = details.message || '';

    if (typeof details.expected !== 'undefined') {
      if (response) {
        response += ', ';
      }

      response += 'expected: ' + details.expected + ', but was: ' + details.actual;
    }

    if (details.source) {
      response += '\n' + details.source;
    }

    currentTestAssertions.push('Failed assertion: ' + response);
  });

  QUnit.testDone(function(result) {
    let i,
      len,
      name = '';

    if (result.module) {
      name += result.module + ': ';
    }
    name += result.name;

    testsTotal++;

    if (result.failed) {
      testsFailed++;
      console.log('\n' + 'Test failed: ' + name);

      for (i = 0, len = currentTestAssertions.length; i < len; i++) {
        console.log('    ' + currentTestAssertions[i]);
      }
    } else {
      testsPassed++;
    }

    currentTestAssertions.length = 0;
  });

  QUnit.moduleDone(m => {
    console.log(
      `Module "${m.name}" finished ${m.total} tests${m.failed > 0 ? `${m.failed} failed` : ''}`
    );
  });

  QUnit.done(function(result) {
    console.log(
      '\n' +
        'Took ' +
        result.runtime +
        'ms to run ' +
        testsTotal +
        ' tests. ' +
        testsPassed +
        ' passed, ' +
        testsFailed +
        ' failed.'
    );

    window.sendMessageToHost({
      name: 'QUnit.done',
      data: result,
    });
  });
});
