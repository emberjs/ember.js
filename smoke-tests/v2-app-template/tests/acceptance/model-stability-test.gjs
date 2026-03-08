import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import {
  getDestroyedModels,
  clearDestroyedModels,
} from 'v2-app-template/components/model-probe';

module('Acceptance | @model stability during route transitions', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    clearDestroyedModels();
  });

  test('@model should be stable when transitioning out of the route', async function (assert) {
    // Transition to sibling's parent (up one level)
    await visit('/a/b');
    await visit('/a');

    // Transition to sibling route
    await visit('/a/b');
    await visit('/a/c');

    // Transition to unrelated parent route
    await visit('/a/b');
    await visit('/d');

    // Transition to unrelated nested route
    await visit('/a/b');
    await visit('/d/e');

    // Transition to unrelated leaf route
    await visit('/a/b');
    await visit('/f');

    assert.deepEqual(
      getDestroyedModels(),
      ['b', 'b', 'b', 'b', 'b'],
      'The @model value should remain stable in willDestroy for all transition types'
    );
  });
});
