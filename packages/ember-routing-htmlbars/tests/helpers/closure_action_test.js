import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import EmberComponent from 'ember-htmlbars/component';
import { computed } from 'ember-metal/computed';
import { INVOKE } from 'ember-routing-htmlbars/keywords/closure-action';
import { subscribe, unsubscribe } from 'ember-metal/instrumentation';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';
import ComponentLookup from 'ember-views/component_lookup';
import EventDispatcher from 'ember-views/system/event_dispatcher';

import {
  runAppend,
  runDestroy
} from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import isEnabled from 'ember-metal/features';

var innerComponent, outerComponent, originalViewKeyword, owner, view, dispatcher;

function buildResolver() {
  let resolver = {
    resolve() { },
    expandLocalLookup(fullName, sourceFullName) {
      let [sourceType, sourceName ] = sourceFullName.split(':');
      let [type, name ] = fullName.split(':');

      if (type !== 'template' && sourceType === 'template' && sourceName.slice(0, 11) === 'components/') {
        sourceName = sourceName.slice(11);
      }

      if (type === 'template' && sourceType === 'template' && name.slice(0, 11) === 'components/') {
        name = name.slice(11);
      }


      let result = `${type}:${sourceName}/${name}`;

      return result;
    }
  };

  return resolver;
}

function registerTemplate(moduleName, snippet) {
  owner.register(`template:${moduleName}`, compile(snippet, { moduleName }));
}

function registerComponent(name, factory) {
  owner.register(`component:${name}`, factory);
}

function appendViewFor(template, moduleName='', hash={}) {
  let view = EmberComponent.extend({
    layout: compile(template, { moduleName }),
    [OWNER]: owner
  }).create(hash);

  runAppend(view);

  return view;
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

let subscriber;
testModule('ember-routing-htmlbars: action helper', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    owner = buildOwner({
      _registryOptions: {
        resolver: buildResolver()
      }
    });
    owner.registerOptionsForType('component', { singleton: false });
    owner.registerOptionsForType('view', { singleton: false });
    owner.registerOptionsForType('template', { instantiate: false });
    owner.register('component-lookup:main', ComponentLookup);
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    runDestroy(innerComponent);
    runDestroy(outerComponent);
    runDestroy(view);
    runDestroy(owner);
    resetKeyword('view', originalViewKeyword);
    if (subscriber) {
      unsubscribe(subscriber);
    }
    owner = view = null;
    runDestroy(dispatcher);
  }
});

if (isEnabled('ember-improved-instrumentation')) {
  test('action should fire interaction event', function(assert) {
    assert.expect(2);

    subscriber = subscribe('interaction.ember-action', {
      before() {
        assert.ok(true, 'instrumentation subscriber was called');
      }
    });

    registerTemplate('components/inner-component', '<button id="instrument-button" {{action "fireAction"}}>What it do</button>');
    registerComponent('inner-component', EmberComponent.extend({
      actions: {
        fireAction() {
          this.attrs.submit();
        }
      }
    }));

    registerTemplate('components/outer-component', '{{inner-component submit=(action outerSubmit)}}');
    registerComponent('outer-component', EmberComponent.extend({
      innerComponent,
      outerSubmit() {
        assert.ok(true, 'action is called');
      }
    }));

    view = appendViewFor(`{{outer-component}}`);

    view.$('#instrument-button').trigger('click');
  });

  test('interaction event subscriber should be passed parameters', function(assert) {
    assert.expect(2);

    let actionParam = 'So krispy';

    subscriber = subscribe('interaction.ember-action', {
      before(name, timestamp, payload) {
        assert.equal(payload.args[0], actionParam, 'instrumentation subscriber before function was passed closure action parameters');
      },
      after(name, timestamp, payload) {
        assert.equal(payload.args[0], actionParam, 'instrumentation subscriber after function was passed closure action parameters');
      }
    });

    registerTemplate('components/inner-component', '<button id="instrument-button" {{action "fireAction"}}>What it do</button>');
    registerComponent('inner-component', EmberComponent.extend({
      actions: {
        fireAction() {
          this.attrs.submit(actionParam);
        }
      }
    }));

    registerTemplate('components/outer-component', '{{inner-component submit=(action outerSubmit)}}');
    registerComponent('outer-component', EmberComponent.extend({
      innerComponent,
      outerSubmit() {}
    }));

    view = appendViewFor(`{{outer-component}}`);

    view.$('#instrument-button').trigger('click');
  });

  test('interaction event subscriber should be passed target', function(assert) {
    assert.expect(2);

    subscriber = subscribe('interaction.ember-action', {
      before(name, timestamp, payload) {
        assert.equal(payload.target.get('myProperty'), 'outer-thing', 'instrumentation subscriber before function was passed target');
      },
      after(name, timestamp, payload) {
        assert.equal(payload.target.get('myProperty'), 'outer-thing', 'instrumentation subscriber after function was passed target');
      }
    });

    registerTemplate('components/inner-component', '<button id="instrument-button" {{action "fireAction"}}>What it do</button>');
    registerComponent('inner-component', EmberComponent.extend({
      myProperty: 'inner-thing',
      actions: {
        fireAction() {
          this.attrs.submit();
        }
      }
    }));

    registerTemplate('components/outer-component', '{{inner-component submit=(action outerSubmit)}}');
    registerComponent('outer-component', EmberComponent.extend({
      myProperty: 'outer-thing',
      innerComponent,
      outerSubmit() {}
    }));

    view = appendViewFor(`{{outer-component}}`);

    view.$('#instrument-button').trigger('click');
  });

  test('instrumented action should return value', function(assert) {
    assert.expect(1);

    var returnedValue = 'Chris P is so krispy';

    registerTemplate('components/inner-component', '<button id="instrument-button" {{action "fireAction"}}>What it do</button>');
    registerComponent('inner-component', EmberComponent.extend({
      actions: {
        fireAction() {
          var actualReturnedValue = this.attrs.submit();
          assert.equal(actualReturnedValue, returnedValue, 'action can return to caller');
        }
      }
    }));

    registerTemplate('components/outer-component', '{{inner-component submit=(action outerSubmit)}}');
    registerComponent('outer-component', EmberComponent.extend({
      innerComponent,
      outerSubmit() {
        return returnedValue;
      }
    }));

    view = appendViewFor(`{{outer-component}}`);

    view.$('#instrument-button').trigger('click');
  });
}

test('action should be called', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile('{{view innerComponent submit=(action outerSubmit)}}'),
    innerComponent,
    outerSubmit() {
      assert.ok(true, 'action is called');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('an error is triggered when bound action function is undefined', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.extend({
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile('{{view innerComponent submit=(action somethingThatIsUndefined)}}'),
    innerComponent
  }).create();

  throws(function() {
    runAppend(outerComponent);
  }, /An action could not be made for `somethingThatIsUndefined` in .*\. Please confirm that you are using either a quoted action name \(i\.e\. `\(action 'somethingThatIsUndefined'\)`\) or a function available in .*\./);
});

test('[#12718] a nice error is shown when a bound action function is undefined and it is passed as attrs.foo', function(assert) {
  registerComponent('inner-component', EmberComponent.extend({
    [OWNER]: owner
  }));
  registerTemplate('components/inner-component', '<button id="inner-button" {{action (action attrs.external-action)}}>Click me</button>');

  view = EmberComponent.extend({
    layout: compile('{{inner-component}}'),
    [OWNER]: owner
  }).create();

  throws(function() {
    runAppend(view);
  }, /Action passed is null or undefined in \(action [^)]*\) from .*\./);
});

test('action value is returned', function(assert) {
  assert.expect(1);

  var returnedValue = 'terrible tom';

  innerComponent = EmberComponent.extend({
    fireAction() {
      var actualReturnedValue = this.attrs.submit();
      assert.equal(actualReturnedValue, returnedValue, 'action can return to caller');
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile('{{view innerComponent submit=(action outerSubmit)}}'),
    innerComponent,
    outerSubmit() {
      return returnedValue;
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('action should be called on the correct scope', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile('{{view innerComponent submit=(action outerSubmit)}}'),
    innerComponent,
    isOuterComponent: true,
    outerSubmit() {
      assert.ok(this.isOuterComponent, 'action has the correct context');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('arguments to action are passed, curry', function(assert) {
  assert.expect(4);

  let first = 'mitch';
  let second =  'martin';
  let third = 'matt';
  let fourth = 'wacky wycats';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit(fourth);
    }
  }).create();

  outerComponent = EmberComponent.extend({
    third,
    layout: compile(`
        {{view innerComponent submit=(action (action outerSubmit "${first}") "${second}" third)}}
      `),
    innerComponent,
    outerSubmit(actualFirst, actualSecond, actualThird, actualFourth) {
      assert.equal(actualFirst, first, 'action has the correct first arg');
      assert.equal(actualSecond, second, 'action has the correct second arg');
      assert.equal(actualThird, third, 'action has the correct third arg');
      assert.equal(actualFourth, fourth, 'action has the correct fourth arg');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('arguments to action are bound', function(assert) {
  assert.expect(1);

  let value = 'lazy leah';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action outerSubmit value)}}
      `),
    innerComponent,
    value: '',
    outerSubmit(actualValue) {
      assert.equal(actualValue, value, 'action has the correct first arg');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    outerComponent.set('value', value);
  });

  innerComponent.fireAction();
});

test('array arguments are passed correctly to action', function(assert) {
  assert.expect(3);

  let first = 'foo';
  let second = [3, 5];
  let third = [4, 9];

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit(second, third);
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action outerSubmit first)}}
      `),
    innerComponent,
    value: '',
    outerSubmit(actualFirst, actualSecond, actualThird) {
      assert.equal(actualFirst, first, 'action has the correct first arg');
      assert.equal(actualSecond, second, 'action has the correct second arg');
      assert.equal(actualThird, third, 'action has the correct third arg');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    outerComponent.set('first', first);
    outerComponent.set('second', second);
  });

  innerComponent.fireAction();
});

test('mut values can be wrapped in actions, are settable', function(assert) {
  assert.expect(1);

  var newValue = 'trollin trek';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit(newValue);
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action (mut outerMut))}}
      `),
    innerComponent,
    outerMut: 'patient peter'
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
    assert.equal(outerComponent.get('outerMut'), newValue, 'mut value is set');
  });
});

test('mut values can be wrapped in actions, are settable with a curry', function(assert) {
  assert.expect(1);

  var newValue = 'trollin trek';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action (mut outerMut) '${newValue}')}}
      `),
    innerComponent,
    outerMut: 'patient peter'
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
    assert.equal(outerComponent.get('outerMut'), newValue, 'mut value is set');
  });
});

test('action can create closures over actions', function(assert) {
  assert.expect(3);

  var first = 'raging robert';
  var second = 'mild machty';
  var returnValue = 'butch brian';

  innerComponent = EmberComponent.extend({
    fireAction() {
      var actualReturnedValue = this.attrs.submit(second);
      assert.equal(actualReturnedValue, returnValue, 'return value is present');
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action 'outerAction' '${first}')}}
      `),
    innerComponent,
    actions: {
      outerAction(actualFirst, actualSecond) {
        assert.equal(actualFirst, first, 'first argument is correct');
        assert.equal(actualSecond, second, 'second argument is correct');
        return returnValue;
      }
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('provides a helpful error if an action is not present', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action 'doesNotExist')}}
      `),
    innerComponent,
    actions: {
      something() {
        // this is present to ensure `actions` hash is present
        // a different error is triggered if `actions` is missing
        // completely
      }
    }
  }).create();

  throws(function() {
    runAppend(outerComponent);
  }, /An action named 'doesNotExist' was not found in /);
});

test('provides a helpful error if actions hash is not present', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action 'doesNotExist')}}
      `),
    innerComponent
  }).create();

  throws(function() {
    runAppend(outerComponent);
  }, /An action named 'doesNotExist' was not found in /);
});

test('action can create closures over actions with target', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action 'outerAction' target=otherComponent)}}
      `),
    innerComponent,
    otherComponent: computed(function() {
      return {
        actions: {
          outerAction(actualFirst, actualSecond) {
            assert.ok(true, 'action called on otherComponent');
          }
        }
      };
    })
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('value can be used with action over actions', function(assert) {
  assert.expect(1);

  let newValue = 'yelping yehuda';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit({
        readProp: newValue
      });
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action 'outerAction' value="readProp")}}
      `),
    innerComponent,
    outerContent: {
      readProp: newValue
    },
    actions: {
      outerAction(actualValue) {
        assert.equal(actualValue, newValue, 'value is read');
      }
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('action will read the value of a first property', function(assert) {
  assert.expect(1);

  let newValue = 'irate igor';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit({
        readProp: newValue
      });
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action outerAction value="readProp")}}
      `),
    innerComponent,
    outerAction(actualNewValue) {
      assert.equal(actualNewValue, newValue, 'property is read');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('action will read the value of a curried first argument property', function(assert) {
  assert.expect(1);

  let newValue = 'kissing kris';

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`
        {{view innerComponent submit=(action outerAction objectArgument value="readProp")}}
      `),
    innerComponent,
    objectArgument: {
      readProp: newValue
    },
    outerAction(actualNewValue) {
      assert.equal(actualNewValue, newValue, 'property is read');
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('action closure does not get auto-mut wrapped', function(assert) {
  assert.expect(3);

  var first = 'raging robert';
  var second = 'mild machty';
  var returnValue = 'butch brian';

  innerComponent = EmberComponent.extend({
    middleComponent,

    fireAction() {
      var actualReturnedValue = this.attrs.submit(second);
      assert.equal(actualReturnedValue, returnValue, 'return value is present');
    }
  }).create();

  var middleComponent = EmberComponent.extend({
    innerComponent,

    layout: compile(`
        {{view innerComponent submit=attrs.submit}}
      `)
  }).create();

  outerComponent = EmberComponent.extend({
    middleComponent,

    layout: compile(`
        {{view middleComponent submit=(action 'outerAction' '${first}')}}
      `),

    actions: {
      outerAction(actualFirst, actualSecond) {
        assert.equal(actualFirst, first, 'first argument is correct');
        assert.equal(actualSecond, second, 'second argument is correct');

        return returnValue;
      }
    }
  }).create();

  runAppend(outerComponent);

  run(function() {
    innerComponent.fireAction();
  });
});

test('action should be called within a run loop', function(assert) {
  assert.expect(1);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`{{view innerComponent submit=(action 'submit')}}`),
    innerComponent,
    actions: {
      submit(newValue) {
        assert.ok(run.currentRunLoop, 'action is called within a run loop');
      }
    }
  }).create();

  runAppend(outerComponent);

  innerComponent.fireAction();
});

test('objects that define INVOKE can be casted to actions', function(assert) {
  assert.expect(2);

  innerComponent = EmberComponent.extend({
    fireAction() {
      assert.equal(this.attrs.submit(4, 5, 6), 123);
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile(`{{view innerComponent submit=(action submitTask 1 2 3)}}`),
    innerComponent,
    foo: 123,
    submitTask: computed(function() {
      return {
        [INVOKE]: (...args) => {
          assert.deepEqual(args, [1, 2, 3, 4, 5, 6]);
          return this.foo;
        }
      };
    })
  }).create();

  runAppend(outerComponent);

  innerComponent.fireAction();
});
