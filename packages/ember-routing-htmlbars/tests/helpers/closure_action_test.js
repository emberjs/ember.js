import run from "ember-metal/run_loop";
import compile from "ember-template-compiler/system/compile";
import EmberComponent from "ember-views/views/component";

import {
  runAppend,
  runDestroy
} from "ember-runtime/tests/utils";

var innerComponent, outerComponent;

if (Ember.FEATURES.isEnabled("ember-routing-htmlbars-improved-actions")) {

  QUnit.module("ember-routing-htmlbars: action helper", {
    setup() {
    },

    teardown() {
      runDestroy(innerComponent);
      runDestroy(outerComponent);
    }
  });

  QUnit.test("action should be called", function(assert) {
    assert.expect(1);

    innerComponent = EmberComponent.extend({
      fireAction() {
        this.attrs.submit();
      }
    }).create();

    outerComponent = EmberComponent.extend({
      layout: compile("{{view innerComponent submit=(action outerSubmit)}}"),
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

  QUnit.test("action value is returned", function(assert) {
    assert.expect(1);

    var returnedValue = 'terrible tom';

    innerComponent = EmberComponent.extend({
      fireAction() {
        var actualReturnedValue = this.attrs.submit();
        assert.equal(actualReturnedValue, returnedValue, 'action can return to caller');
      }
    }).create();

    outerComponent = EmberComponent.extend({
      layout: compile("{{view innerComponent submit=(action outerSubmit)}}"),
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

  QUnit.test("action should be called on the correct scope", function(assert) {
    assert.expect(1);

    innerComponent = EmberComponent.extend({
      fireAction() {
        this.attrs.submit();
      }
    }).create();

    outerComponent = EmberComponent.extend({
      layout: compile("{{view innerComponent submit=(action outerSubmit)}}"),
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

  QUnit.test("arguments to action are passed, curry", function(assert) {
    assert.expect(4);

    const first = 'mitch';
    const second =  'martin';
    const third = 'matt';
    const fourth = 'wacky wycats';

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

  QUnit.test("arguments to action are bound", function(assert) {
    assert.expect(1);

    const value = 'lazy leah';

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

  QUnit.test("mut values can be wrapped in actions, are settable", function(assert) {
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

  QUnit.test("mut values can be wrapped in actions, are settable with a curry", function(assert) {
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

  QUnit.test("action can create closures over sendAction", function(assert) {
    assert.expect(2);

    var first = 'raging robert';
    var second = 'mild machty';

    innerComponent = EmberComponent.extend({
      fireAction() {
        this.attrs.submit(second);
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
        }
      }
    }).create();

    runAppend(outerComponent);

    run(function() {
      innerComponent.fireAction();
    });
  });

  QUnit.test("action can create closures over sendAction with target", function(assert) {
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
      otherComponent: EmberComponent.extend({
        actions: {
          outerAction(actualFirst, actualSecond) {
            assert.ok(true, 'action called on otherComponent');
          }
        }
      }).create()
    }).create();

    runAppend(outerComponent);

    run(function() {
      innerComponent.fireAction();
    });
  });

  QUnit.test("value can be used with action over sendAction", function(assert) {
    assert.expect(1);

    const newValue = 'yelping yehuda';

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

  QUnit.test("action will read the value of a first property", function(assert) {
    assert.expect(1);

    const newValue = 'irate igor';

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

  QUnit.test("action will read the value of a curried first argument property", function(assert) {
    assert.expect(1);

    const newValue = 'kissing kris';

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

}
