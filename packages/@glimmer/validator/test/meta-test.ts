import { module, test } from './-utils';

import {
  dirtyTagFor,
  tagFor,
  validate,
  value,
} from '@glimmer/validator';

module('@glimmer/validator: meta', () => {
  test('it creates a unique tag for a property on a given object', assert => {
    let obj = {};
    let tag = tagFor(obj, 'foo');
    assert.equal(tagFor(obj, 'foo'), tag);
  });

  test('it can dirty the tag for a property on a given object', assert => {
    let obj = {};
    let tag = tagFor(obj, 'foo');

    let snapshot = value(tag);
    dirtyTagFor(obj, 'foo');

    assert.notOk(validate(tag, snapshot));
  });
});
