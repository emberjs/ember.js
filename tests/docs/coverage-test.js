/* eslint-disable no-console */
'use strict';

const QUnit = require('qunit');
const test = QUnit.test;
const path = require('path');

QUnit.module('Docs coverage', function(hooks) {
  let docs, expected;
  hooks.before(function() {
    if (!process.env.REUSE_DOCS) {
      buildDocs();
    }
    docs = require(path.join(__dirname, '../../docs/data.json'));
    expected = require('./expected');
  });

  QUnit.module('classitems', function(hooks) {
    let docsItems, expectedItems;
    hooks.before(function() {
      docsItems = new Set(docs.classitems.map(item => item.name).filter(Boolean));
      expectedItems = new Set(expected.classitems);
    });

    test('No missing classitems', function(assert) {
      let missing = setDifference(expectedItems, docsItems);
      assert.emptySet(
        missing,
        'If you really intended to remove these from the API docs, update tests/docs/expected.js to match.'
      );
    });

    test('No extraneous classitems', function(assert) {
      let extraneous = setDifference(docsItems, expectedItems);
      assert.emptySet(
        extraneous,
        'If you really intended to add these to the API docs, update tests/docs/expected.js to match.'
      );
    });
  });
});

function buildDocs() {
  let child = require('child_process');
  child.execFileSync('node', [require.resolve('ember-cli/bin/ember'), 'ember-cli-yuidoc'], {
    stdio: 'pipe',
  });
}

function setDifference(setA, setB) {
  let difference = new Set(setA);
  for (var elem of setB) {
    difference.delete(elem);
  }
  return difference;
}

QUnit.assert.emptySet = function assertEmptySet(value, message) {
  this.pushResult({
    result: value.size === 0,
    actual: Array.from(value).sort(),
    expected: [],
    message: message,
  });
};
