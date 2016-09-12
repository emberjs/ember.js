import { generateGuid } from 'ember-utils';
import CopyableTests from '../suites/copyable';
import Copyable from '../../mixins/copyable';
import { Freezable } from '../../mixins/freezable';
import EmberObject from '../../system/object';
import { set, get } from 'ember-metal';

QUnit.module('Ember.Copyable.frozenCopy');

QUnit.test('should be deprecated', function() {
  expectDeprecation('`frozenCopy` is deprecated, use `Object.freeze` instead.');

  let Obj = EmberObject.extend(Freezable, Copyable, {
    copy() {
      return Obj.create();
    }
  });

  Obj.create().frozenCopy();
});

const CopyableObject = EmberObject.extend(Copyable, {
  id: null,

  init() {
    this._super(...arguments);
    set(this, 'id', generateGuid());
  },

  copy() {
    let ret = new CopyableObject();
    set(ret, 'id', get(this, 'id'));
    return ret;
  }
});

CopyableTests.extend({

  name: 'Copyable Basic Test',

  newObject() {
    return new CopyableObject();
  },

  isEqual(a, b) {
    if (!(a instanceof CopyableObject) || !(b instanceof CopyableObject)) {
      return false;
    }

    return get(a, 'id') === get(b, 'id');
  }
}).run();
