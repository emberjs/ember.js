import { addObserver } from 'ember-metal/observer';
import { get } from 'ember-metal/property_get';
import { finishChains } from 'ember-metal/chains';
import { defineProperty } from 'ember-metal/properties';
import computed from 'ember-metal/computed';
import { propertyDidChange } from 'ember-metal/property_events';

QUnit.module('Chains');

QUnit.test("finishChains should properly copy chains from prototypes to instances", function() {
  function didChange() {}

  var obj = {};
  addObserver(obj, 'foo.bar', null, didChange);

  var childObj = Object.create(obj);
  finishChains(childObj);

  ok(obj['__ember_meta__'].chains !== childObj['__ember_meta__'].chains, "The chains object is copied");
});


QUnit.test('observer and CP chains', function() {
  var obj = { };

  defineProperty(obj, 'foo', computed('qux.[]', function() { }));
  defineProperty(obj, 'qux', computed(function() { }));

  // create DK chains
  get(obj, 'foo');

  // create observer chain
  addObserver(obj, 'qux.length', function() { });

  /*
             +-----+
             | qux |   root CP
             +-----+
                ^
         +------+-----+
         |            |
     +--------+    +----+
     | length |    | [] |  chainWatchers
     +--------+    +----+
      observer       CP(foo, 'qux.[]')
  */


  // invalidate qux
  propertyDidChange(obj, 'qux');

  // CP chain is blown away

  /*
             +-----+
             | qux |   root CP
             +-----+
                ^
         +------+xxxxxx
         |            x
     +--------+    xxxxxx
     | length |    x [] x  chainWatchers
     +--------+    xxxxxx
      observer       CP(foo, 'qux.[]')
  */

  get(obj, 'qux'); // CP chain re-recreated
  ok(true, 'no crash');
});
