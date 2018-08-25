'use strict';

/**
 * This tests whether there is a change in the number of modules, classes, or properties that yuidoc sees. It is not a guarantee that all documentation will show up in the Ember API docs app, but it checks for major regressions.
 */

const fs = require('fs');
const docData = JSON.parse(fs.readFileSync('./docs/data.json', 'utf8'));

const expectedCounts = [
  {
    category: 'files',
    count: 180,
  },
  {
    category: 'modules',
    count: 21,
  },
  {
    category: 'classes',
    count: 109,
  },
  {
    category: 'classitems',
    count: 811,
  },
];

const failedTestMessage = function(expectedCount, actualCount, category) {
  let report = `${expectedCount} ${category} documentation entries expected, ${actualCount} present. \n`;
  if (expectedCount < actualCount) {
    return (
      report +
      'If you have added new features, please increment the expectedCounts in the yuidoc-tests.js and confirm that any public properties are marked both @public and @static to be included in the Ember API Docs viewer.'
    );
  } else {
    return (
      report +
      'Documentation is missing, incorrectly formatted, or in a directory that is not watched by yuidoc. All files containing documentation must have a yuidoc class declaration.'
    );
  }
};

expectedCounts.forEach(function(expected) {
  QUnit.test(expected.category, function(assert) {
    const docsToCount = docData[expected.category];
    const actualCount = Object.keys(docsToCount).length;
    let message = failedTestMessage(expected.count, actualCount, expected.category);
    assert.ok(actualCount === expected.count, message);
  });
});
