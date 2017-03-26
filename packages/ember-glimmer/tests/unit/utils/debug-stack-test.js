import DebugStack from 'ember-glimmer/utils/debug-stack';
import { DEBUG } from 'ember-env-flags';

if (DEBUG) {
  QUnit.module('Glimmer DebugStack');

  QUnit.test('pushing and popping', function(assert) {
    let stack = new DebugStack();

    assert.equal(stack.peek(), undefined);

    stack.push('template:application');

    assert.equal(stack.peek(), '"template:application"');

    stack.push('component:top-level-component');

    assert.equal(stack.peek(), '"component:top-level-component"');

    stack.pushEngine('engine:my-engine');
    stack.push('component:component-in-engine');

    assert.equal(stack.peek(), '"component:component-in-engine" (in "engine:my-engine")');

    stack.pop();
    stack.pop();
    let item = stack.pop();

    assert.equal(item, 'component:top-level-component');
    assert.equal(stack.peek(), '"template:application"');
  });
}
