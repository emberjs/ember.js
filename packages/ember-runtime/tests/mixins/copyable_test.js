import CopyableTests from 'ember-runtime/tests/suites/copyable';
import Copyable from 'ember-runtime/mixins/copyable';
import EmberObject from 'ember-runtime/system/object';
import {generateGuid} from 'ember-metal/utils';
import {set} from 'ember-metal/property_set';
import {get} from 'ember-metal/property_get';

var CopyableObject = EmberObject.extend(Copyable, {

  id: null,

  init: function() {
    this._super.apply(this, arguments);
    set(this, 'id', generateGuid());
  },

  copy: function() {
    var ret = new CopyableObject();
    set(ret, 'id', get(this, 'id'));
    return ret;
  }
});

CopyableTests.extend({

  name: 'Copyable Basic Test',

  newObject: function() {
    return new CopyableObject();
  },

  isEqual: function(a, b) {
    if (!(a instanceof CopyableObject) || !(b instanceof CopyableObject)) {
      return false;
    }

    return get(a, 'id') === get(b, 'id');
  }
}).run();
