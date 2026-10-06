import { dirtyTagFor, tagFor, validateTag, valueForTag } from '@glimmer/signals';

import { module, test } from './-utils';

module('@glimmer/signals: meta', () => {
  test('it creates a unique tag for a property on a given object', (assert) => {
    let obj = {};
    let tag = tagFor(obj, 'foo');
    assert.strictEqual(tagFor(obj, 'foo'), tag);
  });

  test('it can dirty the tag for a property on a given object', (assert) => {
    let obj = {};
    let tag = tagFor(obj, 'foo');

    let snapshot = valueForTag(tag);
    dirtyTagFor(obj, 'foo');

    assert.notOk(validateTag(tag, snapshot));
  });
});
