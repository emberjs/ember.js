import ArrayProxy from 'ember-runtime/system/array_proxy';
import Object from 'ember-runtime/system/object';
import { observer } from 'ember-metal/mixin';
import { computed } from 'ember-metal/computed';
import { A as a } from 'ember-runtime/system/native_array';

QUnit.module('Ember.ArrayProxy - content change (length)');

QUnit.test('asdfasdf', function() {
  var aCalled, bCalled, cCalled, dCalled, eCalled;

  aCalled = bCalled = cCalled = dCalled = eCalled = 0;

  var obj = Object.extend({
    colors: computed.reads('model'),
    length: computed.reads('colors.length'),

    a: observer('length', function() {
      aCalled++;
    }),

    b: observer('colors.length', function() {
      bCalled++;
    }),

    c: observer('colors.content.length', function() {
      cCalled++;
    }),

    d: observer('colors.[]', function() {
      dCalled++;
    }),

    e: observer('colors.content.[]', function() {
      eCalled++;
    })
  }).create();

  obj.set('model', ArrayProxy.create({
    content: a([
      'red',
      'yellow',
      'blue'
    ])
  })
  );

  equal(obj.get('colors.content.length'), 3);
  equal(obj.get('colors.length'), 3);
  equal(obj.get('length'), 3);

  equal(aCalled, 1, 'expected observer `length` to be called ONCE');
  equal(bCalled, 1, 'expected observer `colors.length` to be called ONCE');
  equal(cCalled, 1, 'expected observer `colors.content.length` to be called ONCE');
  equal(dCalled, 1, 'expected observer `colors.[]` to be called ONCE');
  equal(eCalled, 1, 'expected observer `colors.content.[]` to be called ONCE');

  obj.get('colors').pushObjects([
    'green',
    'red'
  ]);

  equal(obj.get('colors.content.length'), 5);
  equal(obj.get('colors.length'), 5);
  equal(obj.get('length'), 5);

  equal(aCalled, 2, 'expected observer `length` to be called TWICE');
  equal(bCalled, 2, 'expected observer `colors.length` to be called TWICE');
  equal(cCalled, 2, 'expected observer `colors.content.length` to be called TWICE');
  equal(dCalled, 2, 'expected observer `colors.[]` to be called TWICE');
  equal(eCalled, 2, 'expected observer `colors.content.[]` to be called TWICE');
});
