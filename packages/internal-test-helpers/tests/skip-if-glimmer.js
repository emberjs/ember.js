import isEnabled from 'ember-metal/features';

export function test(name, fn) {
  if (isEnabled('ember-glimmer')) {
    QUnit.skip('[SKIPPED IN GLIMMER] ' + name, fn);
  } else {
    QUnit.test(name, fn);
  }
}

export function asyncTest(name, fn) {
  if (isEnabled('ember-glimmer')) {
    QUnit.skip('[SKIPPED IN GLIMMER] ' + name, fn);
  } else {
    QUnit.asyncTest(name, fn);
  }
}
