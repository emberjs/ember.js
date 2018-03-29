import { context } from 'ember-environment';
import EmberObject from '../../system/object';
import TargetActionSupport from '../../mixins/target_action_support';

let originalLookup = context.lookup;
let lookup;

QUnit.module('TargetActionSupport', {
  beforeEach() {
    context.lookup = lookup = {};
  },
  afterEach() {
    context.lookup = originalLookup;
  }
});

QUnit.test(
  'it should return false if no target or action are specified',
  function(assert) {
    assert.expect(1);

    let obj = EmberObject.extend(TargetActionSupport).create();

    assert.ok(
      false === obj.triggerAction(),
      'no target or action was specified'
    );
  }
);

QUnit.test('it should support actions specified as strings', function(assert) {
  assert.expect(2);

  let obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent() {
        assert.ok(true, 'anEvent method was called');
      }
    }),

    action: 'anEvent'
  });

  assert.ok(
    true === obj.triggerAction(),
    'a valid target and action were specified'
  );
});

QUnit.test(
  'it should invoke the send() method on objects that implement it',
  function(assert) {
    assert.expect(3);

    let obj = EmberObject.extend(TargetActionSupport).create({
      target: EmberObject.create({
        send(evt, context) {
          assert.equal(
            evt,
            'anEvent',
            'send() method was invoked with correct event name'
          );
          assert.equal(
            context,
            obj,
            'send() method was invoked with correct context'
          );
        }
      }),

      action: 'anEvent'
    });

    assert.ok(
      true === obj.triggerAction(),
      'a valid target and action were specified'
    );
  }
);

QUnit.test('it should find targets specified using a property path', function(
  assert
) {
  assert.expect(2);

  let Test = {};
  lookup.Test = Test;

  Test.targetObj = EmberObject.create({
    anEvent() {
      assert.ok(true, 'anEvent method was called on global object');
    }
  });

  let myObj = EmberObject.extend(TargetActionSupport).create({
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  assert.ok(
    true === myObj.triggerAction(),
    'a valid target and action were specified'
  );
});

QUnit.test(
  'it should use an actionContext object specified as a property on the object',
  function(assert) {
    assert.expect(2);
    let obj = EmberObject.extend(TargetActionSupport).create({
      action: 'anEvent',
      actionContext: {},
      target: EmberObject.create({
        anEvent(ctx) {
          assert.ok(
            obj.actionContext === ctx,
            'anEvent method was called with the expected context'
          );
        }
      })
    });
    assert.ok(
      true === obj.triggerAction(),
      'a valid target and action were specified'
    );
  }
);

QUnit.test(
  'it should raise a deprecation warning when targetObject is specified and used',
  function(assert) {
    assert.expect(4);
    let obj;
    expectDeprecation(() => {
      obj = EmberObject.extend(TargetActionSupport).create({
        action: 'anEvent',
        actionContext: {},
        targetObject: EmberObject.create({
          anEvent(ctx) {
            assert.ok(
              obj.actionContext === ctx,
              'anEvent method was called with the expected context'
            );
          }
        })
      });
    }, /Usage of `targetObject` is deprecated. Please use `target` instead./);
    assert.ok(
      true === obj.triggerAction(),
      'a valid targetObject and action were specified'
    );
    expectDeprecation(
      () => obj.get('targetObject'),
      /Usage of `targetObject` is deprecated. Please use `target` instead./
    );
  }
);

QUnit.test(
  'it should find an actionContext specified as a property path',
  function(assert) {
    assert.expect(2);

    let Test = {};
    lookup.Test = Test;
    Test.aContext = {};

    let obj = EmberObject.extend(TargetActionSupport).create({
      action: 'anEvent',
      actionContext: 'Test.aContext',
      target: EmberObject.create({
        anEvent(ctx) {
          assert.ok(
            Test.aContext === ctx,
            'anEvent method was called with the expected context'
          );
        }
      })
    });

    assert.ok(
      true === obj.triggerAction(),
      'a valid target and action were specified'
    );
  }
);

QUnit.test('it should use the target specified in the argument', function(
  assert
) {
  assert.expect(2);
  let targetObj = EmberObject.create({
    anEvent() {
      assert.ok(true, 'anEvent method was called');
    }
  });
  let obj = EmberObject.extend(TargetActionSupport).create({
    action: 'anEvent'
  });

  assert.ok(
    true === obj.triggerAction({ target: targetObj }),
    'a valid target and action were specified'
  );
});

QUnit.test('it should use the action specified in the argument', function(
  assert
) {
  assert.expect(2);

  let obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent() {
        assert.ok(true, 'anEvent method was called');
      }
    })
  });
  assert.ok(
    true === obj.triggerAction({ action: 'anEvent' }),
    'a valid target and action were specified'
  );
});

QUnit.test(
  'it should use the actionContext specified in the argument',
  function(assert) {
    assert.expect(2);
    let context = {};
    let obj = EmberObject.extend(TargetActionSupport).create({
      target: EmberObject.create({
        anEvent(ctx) {
          assert.ok(
            context === ctx,
            'anEvent method was called with the expected context'
          );
        }
      }),
      action: 'anEvent'
    });

    assert.ok(
      true === obj.triggerAction({ actionContext: context }),
      'a valid target and action were specified'
    );
  }
);

QUnit.test('it should allow multiple arguments from actionContext', function(
  assert
) {
  assert.expect(3);
  let param1 = 'someParam';
  let param2 = 'someOtherParam';
  let obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent(first, second) {
        assert.ok(
          first === param1,
          'anEvent method was called with the expected first argument'
        );
        assert.ok(
          second === param2,
          'anEvent method was called with the expected second argument'
        );
      }
    }),
    action: 'anEvent'
  });

  assert.ok(
    true === obj.triggerAction({ actionContext: [param1, param2] }),
    'a valid target and action were specified'
  );
});

QUnit.test(
  'it should use a null value specified in the actionContext argument',
  function(assert) {
    assert.expect(2);
    let obj = EmberObject.extend(TargetActionSupport).create({
      target: EmberObject.create({
        anEvent(ctx) {
          assert.ok(
            null === ctx,
            'anEvent method was called with the expected context (null)'
          );
        }
      }),
      action: 'anEvent'
    });
    assert.ok(
      true === obj.triggerAction({ actionContext: null }),
      'a valid target and action were specified'
    );
  }
);
