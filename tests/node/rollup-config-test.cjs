'use strict';

QUnit.module('rollup.config.mjs', () => {
  // If the same package appears in both maps pointing at different files, the
  // exposed entrypoint gets built as a separate copy of the package while
  // internal imports resolve to the hidden copy. Consumers then import a
  // different module instance than ember-source configures internally
  // (https://github.com/emberjs/ember.js/issues/21538).
  QUnit.test('exposedDependencies and hiddenDependencies do not overlap', async function (assert) {
    const { exposedDependencies, hiddenDependencies } = await import('../../rollup.config.mjs');

    let exposed = exposedDependencies();
    let hidden = hiddenDependencies();

    let conflicts = Object.keys(exposed).filter(
      (name) => name in hidden && hidden[name] !== exposed[name]
    );

    assert.deepEqual(conflicts, [], 'no package resolves to two different files');
  });
});
