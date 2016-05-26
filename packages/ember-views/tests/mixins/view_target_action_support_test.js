import EmberObject from 'ember-runtime/system/object';
import View from 'ember-views/views/view';
import ViewTargetActionSupport from 'ember-views/mixins/view_target_action_support';

QUnit.module('ViewTargetActionSupport');

QUnit.test('it should return false if no action is specified', function() {
  expect(1);

  var view = View.extend(ViewTargetActionSupport).create({
    controller: EmberObject.create()
  });

  ok(false === view.triggerAction(), 'a valid target and action were specified');
});

QUnit.test('it should support actions specified as strings', function() {
  expect(2);

  var view = View.extend(ViewTargetActionSupport).create({
    controller: EmberObject.create({
      anEvent() {
        ok(true, 'anEvent method was called');
      }
    }),
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), 'a valid target and action were specified');
});

QUnit.test('it should invoke the send() method on the controller with the view\'s context', function() {
  expect(3);

  var view = View.extend(ViewTargetActionSupport, {
    controller: EmberObject.create({
      send(evt, context) {
        equal(evt, 'anEvent', 'send() method was invoked with correct event name');
        equal(context, view.get('context'), 'send() method was invoked with correct context');
      }
    })
  }).create({
    context: {},
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), 'a valid target and action were specified');
});
